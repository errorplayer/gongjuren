'use client';

import { useEffect, useRef } from 'react';
import styles from './page.module.css';

export default function MomentsGrid() {
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
  // 🔥 修复：旋转后拖动方向错乱（核心修正）
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

  function download() {
    const trans = CONFIG.fillColor === 'transparent';
    imagePieces.forEach((url, i) => {
      const a = document.createElement('a');
      a.download = `九宫格_${i + 1}${trans ? '.png' : '.jpg'}`;
      a.href = url;
      a.click();
    });
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

  return (
    <div className={styles.main}>
      <div className={styles.toolContainer}>
        <h2 className={styles.toolTitle}>朋友圈九宫格切图</h2>
        <p className={styles.toolDesc}>保护隐私 · 本地处理 · 使用更放心</p>

        <label ref={uploadRef} className={styles.uploadBox}>
          <input type="file" accept="image/*" onChange={onUpload} />
          <div className={styles.uploadText}>点击或拖拽上传图片</div>
          <div className={styles.uploadTip}>支持 10M 以内 JPG / PNG 图片</div>
        </label>

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
          <button className={`${styles.actionBtn} ${styles.btnDownload}`} onClick={download}>下载九宫格</button>
        </div>
      </div>
    </div>
  );
}