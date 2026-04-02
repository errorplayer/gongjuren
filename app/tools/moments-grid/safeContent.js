import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
// 引入zip和文件保存库
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function SafeContent() {
const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768;
    };
    setIsMobile(checkMobile());
  }, []);

  const CONFIG = {
    squareSize: 1080,
    sliceCount: 3,
    fillColor: '#ffffff',
    quality: 0.92
  };

  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const uploadRef = useRef(null);
  const controlRef = useRef(null);
  const editWrapperRef = useRef(null);
  const btnGroupRef = useRef(null);
  const scaleRef = useRef(null);

  let originImg = null;
  let editCtx;
  let imagePieces = [];
  let offsetX = 0, offsetY = 0;
  let drawWidth, drawHeight;
  let baseDrawW, baseDrawH;
  let scale = 1;
  let rotate = 0;
  let isDragging = false;
  let startX, startY;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    editCtx = canvas.getContext('2d');
    canvas.width = CONFIG.squareSize;
    canvas.height = CONFIG.squareSize;

    initEvents();
    return () => { isDragging = false; };
  }, []);

  function initEvents() {
    const canvas = canvasRef.current;
    canvas?.addEventListener('mousedown', startDrag);
    canvas?.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0]); });
    canvas?.addEventListener('dblclick', () => { resetAll(); redraw(); });

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('touchmove', e => { e.preventDefault(); dragMove(e.touches[0]); });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    // 新增：禁用移动端页面缩放
    document.addEventListener('touchmove', (e) => {
      if (e.scale !== 1) e.preventDefault();
    }, { passive: false });
  }

  async function onUpload(e) {
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'moments-grid' })
    }).catch(() => { });
    const file = e.target.files[0];
    if (!file || file.size > 10 * 1024 * 1024) {
      alert('请上传10M以内图片');
      return;
    }
    originImg = await loadImg(file);
    calcSize();
    baseDrawW = drawWidth;
    baseDrawH = drawHeight;
    resetAll();
    redraw();
    showPanel();
  }

  function loadImg(file) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(file);
    });
  }

  function calcSize() {
    const r = originImg.width / originImg.height;
    const s = CONFIG.squareSize;
    if (r > 1) {
      drawWidth = s;
      drawHeight = s / r;
    } else {
      drawHeight = s;
      drawWidth = s * r;
    }
  }

  function onScale(e) {
    scale = parseFloat(e.target.value);
    drawWidth = baseDrawW * scale;
    drawHeight = baseDrawH * scale;
    redraw();
  }

  function rotateImg() {
    rotate = (rotate + 90) % 360;
    redraw();
  }

  function resetAll() {
    offsetX = (CONFIG.squareSize - drawWidth) / 2;
    offsetY = (CONFIG.squareSize - drawHeight) / 2;
    if (scaleRef.current) scaleRef.current.value = 1;
    scale = 1;
    rotate = 0;
  }

  function redraw() {
    if (!originImg || !editCtx) return;
    const s = CONFIG.squareSize;
    editCtx.clearRect(0, 0, s, s);

    if (CONFIG.fillColor !== 'transparent') {
      editCtx.fillStyle = CONFIG.fillColor;
      editCtx.fillRect(0, 0, s, s);
    }

    editCtx.save();
    editCtx.translate(s / 2, s / 2);
    editCtx.rotate(rotate * Math.PI / 180);
    editCtx.drawImage(originImg, -drawWidth / 2 + offsetX, -drawHeight / 2 + offsetY, drawWidth, drawHeight);
    editCtx.restore();

    generateGrid();
  }

  function generateGrid() {
    const prev = previewRef.current;
    if (!prev) return;
    prev.innerHTML = '';
    const s = CONFIG.squareSize;
    const size = s / 3;
    imagePieces = [];
    const trans = CONFIG.fillColor === 'transparent';

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        ctx.drawImage(canvasRef.current, col * size, row * size, size, size, 0, 0, size, size);
        const url = trans ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', CONFIG.quality);
        imagePieces.push(url);
        const img = new Image();
        img.src = url;
        img.style.width = '100%';
        img.style.aspectRatio = '1/1';
        img.style.objectFit = 'cover';
        prev.appendChild(img);
      }
    }
  }

  // ==============================================
  // 修复：旋转后拖动方向错乱（核心修正）
  // ==============================================
  function startDrag(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
  }

  function dragMove(e) {
    if (!isDragging || !originImg) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;

    // 旋转角度 → 弧度
    const rad = rotate * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 坐标系旋转修正（关键！）
    const fixedDx = dx * cos + dy * sin;
    const fixedDy = -dx * sin + dy * cos;

    offsetX += fixedDx;
    offsetY += fixedDy;

    redraw();
  }
  // ==============================================

  function endDrag() {
    isDragging = false;
  }

  function setColor(color) {
    CONFIG.fillColor = color;
    redraw();
  }

  // 替换原有的download函数
  function download() {
    // 移动端优先打包为ZIP，PC端可保留原多文件下载（也可统一ZIP）
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      downloadAsZip(); // 移动端打包ZIP
    } else {
      downloadMultipleFiles(); // PC端保留原多文件下载
    }
  }

  // 新增：打包为ZIP下载
  async function downloadAsZip() {
    const zip = new JSZip();
    const trans = CONFIG.fillColor === 'transparent';
    const ext = trans ? 'png' : 'jpg';

    // 逐个添加图片到ZIP包
    imagePieces.forEach((url, i) => {
      // 从base64转blob（避免跨域问题）
      const base64Data = url.split(',')[1];
      const contentType = trans ? 'image/png' : 'image/jpeg';
      const blob = b64toBlob(base64Data, contentType);
      // 添加到zip，命名为“九宫格_1.png”格式
      zip.file(`九宫格_${i + 1}.${ext}`, blob);
    });

    // 生成ZIP并下载
    try {
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE', // 压缩（可选）
        compressionOptions: { level: 6 }
      });
      saveAs(zipBlob, `朋友圈九宫格.${ext === 'png' ? 'zip' : 'zip'}`);
      alert('ZIP包生成成功，即将开始下载～');
    } catch (e) {
      console.error('打包ZIP失败', e);
      alert('打包失败，可长按预览图单张保存～');
      // 降级方案：触发单文件分批下载
      downloadBatchFiles();
    }
  }

  // 工具函数：base64转blob
  function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }

  // 原有多文件下载（PC端保留）
  function downloadMultipleFiles() {
    const trans = CONFIG.fillColor === 'transparent';
    imagePieces.forEach((url, i) => {
      const a = document.createElement('a');
      a.download = `九宫格_${i + 1}${trans ? '.png' : '.jpg'}`;
      a.href = url;
      a.click();
    });
  }

  // 新增：分批下载（ZIP失败时的降级方案）
  function downloadBatchFiles() {
    const trans = CONFIG.fillColor === 'transparent';
    // 每300ms下载1张，避免同时触发
    imagePieces.forEach((url, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.download = `九宫格_${i + 1}${trans ? '.png' : '.jpg'}`;
        a.href = url;
        a.click();
      }, i * 300);
    });
    alert('开始分批下载，请允许所有文件下载～');
  }

  function resetTool() {
    originImg = null;
    imagePieces = [];
    rotate = 0;
    uploadRef.current.querySelector('input').value = '';
    uploadRef.current.classList.remove(styles.hidden);
    controlRef.current.classList.add(styles.hidden);
    editWrapperRef.current.classList.add(styles.hidden);
    previewRef.current.innerHTML = '';
    btnGroupRef.current.classList.add(styles.hidden);
  }

  function showPanel() {
    uploadRef.current.classList.add(styles.hidden);
    controlRef.current.classList.remove(styles.hidden);
    editWrapperRef.current.classList.remove(styles.hidden);
    btnGroupRef.current.classList.remove(styles.hidden);
  }

  return (<div className={styles.main}>
      <div className={styles.toolContainer}>
        <h2 className={styles.toolTitle}>朋友圈九宫格切图</h2>
        <p className={styles.toolDesc}>保护隐私 · 本地处理 · 使用更放心</p>

        {isMobile ? (
          <div className={styles.uploadBoxDisabled}>
            <div className={styles.uploadDisabledIcon}>🖥️</div>
            <div className={styles.uploadText}>目前仅支持PC端</div>
            <div className={styles.uploadTip}>请在电脑浏览器中打开本页面使用</div>
          </div>
        ) : (
          <label ref={uploadRef} className={styles.uploadBox}>
            <input type="file" accept="image/*" onChange={onUpload} />
            <div className={styles.uploadText}>点击或拖拽上传图片</div>
            <div className={styles.uploadTip}>支持 10M 以内 JPG / PNG 图片</div>
          </label>
        )}

        <div ref={controlRef} className={`${styles.controlPanel} ${styles.hidden}`}>
          <div className={styles.colorGroup}>
            <span className={styles.colorTitle}>留白颜色：</span>
            <div className={`${styles.colorBtn} ${styles.colorWhite} ${styles.colorBtnActive}`} onClick={() => setColor('#ffffff')} />
            <div className={`${styles.colorBtn} ${styles.colorBlack}`} onClick={() => setColor('#000000')} />
            <div className={`${styles.colorBtn} ${styles.colorTransparent}`} onClick={() => setColor('transparent')} />
          </div>

          <div className={styles.scaleGroup}>
            <span className={styles.scaleTitle}>图片缩放：</span>
            <input ref={scaleRef} type="range" min="0.5" max="2" step="0.01" defaultValue="1" className={styles.scaleSlider} onInput={onScale} />
          </div>

          <div className={styles.rotateGroup}>
            <span className={styles.rotateTitle}>旋转：</span>
            <button className={styles.rotateBtn} onClick={rotateImg}>↻</button>
          </div>
        </div>

        <div ref={editWrapperRef} className={`${styles.editWrapper} ${styles.hidden}`}>
          <canvas ref={canvasRef} className={styles.editCanvas} />
        </div>

        <div ref={previewRef} className={styles.gridPreview}></div>

        <div ref={btnGroupRef} className={`${styles.btnGroup} ${styles.hidden}`}>
          <button className={`${styles.actionBtn} ${styles.btnReset}`} onClick={resetTool}>重新上传</button>
          <button className={`${styles.actionBtn} ${styles.btnDownload}`} onClick={download}>
            {/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
              ? '下载九宫格(ZIP包)'
              : '下载九宫格'
            }
          </button>
          {/* 移动端添加长按提示 */}
          {/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
            <p className={styles.mobileTip}>
              提示：也可长按预览图单张保存
            </p>
          )}
        </div>

      </div>
    </div>);
}