'use client';

import { useState, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import './page.css';

export default function QRCodeGeneratorPage() {
  const [content, setContent] = useState('');
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(200);
  const [qrColor, setQrColor] = useState('#000000');
  const [qrLoaded, setQrLoaded] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef(null);

  const isValidHex = (hex) => /^#[0-9A-Fa-f]{6}$/.test(hex);

  const handleColorChange = (value) => {
    setQrColor(value);
    setError('');
  };

  const handleColorBlur = (e) => {
    let value = e.target.value.trim();
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }
    if (!isValidHex(value)) {
      setError('请输入有效的 HEX 颜色值（如 #ff5500）');
    } else {
      setQrColor(value);
      setError('');
    }
  };

  const handleResetSize = () => {
    setWidth(200);
    setHeight(200);
  };

  const handleGenerate = () => {
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'qrcode-generator' })
    }).catch(() => { });

    if (!content.trim()) {
      setError('请输入二维码内容！');
      return;
    }

    if (!qrLoaded || typeof QRCode === 'undefined') {
      setError('二维码库加载中，请稍候...');
      return;
    }

    if (!isValidHex(qrColor)) {
      setError('请输入有效的 HEX 颜色值（如 #ff5500）');
      return;
    }

    if (resultRef.current) {
      resultRef.current.innerHTML = '';
      new QRCode(resultRef.current, {
        text: content,
        width: width,
        height: height,
        colorDark: qrColor,
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }
  };

  const presetColors = ['#000000', '#198754', '#0d6efd', '#dc3545', '#ffc107', '#6f42c1', '#20c997', '#fd7e14'];

  return (
    <div className="tool-page">
      <Script
        src="https://cdn.bootcdn.net/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
        onReady={() => setQrLoaded(true)}
      />
      <h2>二维码生成器</h2>
      <div className="tool-content">
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>二维码内容</label>
          <input
            type="text"
            className="input-area"
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(''); }}
            placeholder="请输入文字、链接等内容（如：https://www.baidu.com）"
            style={{ minHeight: 'auto', height: '50px' }}
          />
        </div>

        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>二维码尺寸</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 200)}
                min={50}
                max={500}
                style={{
                  width: '100px',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: '#666', fontWeight: '500' }}>×</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 200)}
                min={50}
                max={500}
                style={{
                  width: '100px',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: '#888', fontSize: '13px' }}>px</span>
              <button
                onClick={handleResetSize}
                style={{
                  padding: '10px 16px',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#666'
                }}
              >
                重置为 200×200
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>二维码颜色</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  style={{
                    width: '44px',
                    height: '44px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: '2px',
                    background: '#fff'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}> ← 点击取色</span>
              </div>
              <input
                type="text"
                value={qrColor}
                onChange={(e) => handleColorChange(e.target.value)}
                onBlur={handleColorBlur}
                placeholder="#000000"
                maxLength={7}
                style={{
                  width: '110px',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Consolas, Monaco, monospace'
                }}
              />
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: qrColor,
                  border: '2px solid #e9ecef',
                  flexShrink: 0
                }}
                title="颜色预览"
              />
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '13px', color: '#888', marginRight: '8px' }}>快捷颜色：</span>
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: color,
                    border: qrColor === color ? '2px solid #0d6efd' : '1px solid #ddd',
                    cursor: 'pointer',
                    marginRight: '6px',
                    marginBottom: '4px',
                    transition: 'transform 0.15s'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            color: '#c53030',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(13, 110, 253, 0.35)',
            letterSpacing: '1px'
          }}
        >
          生成二维码
        </button>

        <div className="result-area">
          <div className="result-title">二维码预览</div>
          <div
            ref={resultRef}
            style={{
              textAlign: 'center',
              padding: '24px',
              minHeight: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ color: '#999', fontSize: '14px' }}>
              请输入内容后点击「生成二维码」
            </span>
          </div>
        </div>

        <Link href="/" className="back-btn">
          ← 返回工具目录
        </Link>
      </div>
    </div>
  );
}
