'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sceneList } from '../../../../lib/resume-polish-scenes';

// 生成 modules 的内容指纹
const getModulesFingerprint = (modules) => {
  const fingerprintData = {
    project_experience: modules.project_experience.items.map(item => ({
      id: item.id,
      confirmed: item.confirmed
    })),
    work_responsibility: modules.work_responsibility.confirmed,
    self_evaluation: modules.self_evaluation.confirmed,
    cover_letter: modules.cover_letter.confirmed,
  };
  return JSON.stringify(fingerprintData);
};

export default function ReportPreview() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState({});
  const [modules, setModules] = useState({
    project_experience: { items: [] },
    work_responsibility: { original: '', confirmed: '', insight: '' },
    self_evaluation: { original: '', confirmed: '', insight: '' },
    cover_letter: { original: '', confirmed: '', insight: '' },
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasValidCache, setHasValidCache] = useState(false);

  // 加载 localStorage 数据
  useEffect(() => {
    const saved = localStorage.getItem('career-checkup-session');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.profile) setUserProfile(data.profile);
      if (data.modules) setModules(data.modules);

      // 检查缓存是否有效
      const cachedReport = localStorage.getItem('career-checkup-report-cache');
      if (cachedReport) {
        const cache = JSON.parse(cachedReport);
        const currentFingerprint = getModulesFingerprint(data.modules);
        setHasValidCache(cache.modulesFingerprint === currentFingerprint);
      }
    }
    setLoading(false);
  }, []);

  const handleUpdateModule = (sceneId, field, value) => {
    if (sceneId === 'project_experience') {
      // 项目经历不支持在此处编辑，需要返回 checkup 页面
      alert('项目经历编辑请返回上一页');
      return;
    }
    setModules((prev) => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        [field]: value,
      },
    }));
  };

  const handleConfirmAndGenerate = async () => {
    // 先保存修改到 localStorage
    const sessionData = {
      profile: userProfile,
      modules,
      timestamp: Date.now(),
    };
    localStorage.setItem('career-checkup-session', JSON.stringify(sessionData));

    // 跳转到报告生成页
    router.push('/tools/career/career-checkup/report');
  };



  if (loading) {
    return (
      <div className="report-preview">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-preview">
      <div className="preview-header">
        <Link
          href="/tools/career/career-checkup"
          className="back-link" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'linear-gradient(90deg, #764ba2 0%, #d2d8f3 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '20px',
            fontWeight: 500,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          }}
        >
          ← 返回编辑
        </Link>
        <h1 className="preview-title">📋 确认求职体检信息</h1>
        <p className="preview-subtitle">
          请检查并确认以下信息，确认后将生成综合体检报告
        </p>
      </div>

      {/* 个人画像 */}
      <div className="preview-section">
        <h2 className="section-title">
          <span className="section-icon">👤</span>
          个人画像
        </h2>
        <div className="profile-display">
          <div className="profile-item">
            <span className="profile-label">工作年限：</span>
            <span className="profile-value">{userProfile.years || '未填写'}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">当前岗位：</span>
            <span className="profile-value">{userProfile.role || '未填写'}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">工作城市：</span>
            <span className="profile-value">{userProfile.city || '未填写'}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">期望薪资：</span>
            <span className="profile-value">{userProfile.salary || '未填写'}</span>
          </div>
        </div>
      </div>

      {/* 项目经历 */}
      <div className="preview-section">
        <h2 className="section-title">
          <span className="section-icon">🚀</span>
          项目经历
        </h2>
        <div className="module-content">
          {modules.project_experience.items.length === 0 ? (
            <p className="empty-hint">暂无项目经历</p>
          ) : (
            <div className="project-list">
              {modules.project_experience.items.map((item, index) => (
                <div key={item.id} className="project-item">
                  <div className="project-number">项目 {index + 1}</div>
                  <textarea
                    className="module-textarea"
                    value={item.confirmed}
                    readOnly
                    rows={6}
                  />
                  <div className="project-hint">
                    （编辑项目经历请返回上一页）
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 其他模块 */}
      {sceneList
        .filter((scene) => scene.id !== 'project_experience')
        .map((scene) => {
          const module = modules[scene.id];
          const getPolishKey = (sceneId) => {
            const keys = {
              work_responsibility: '润色后的工作职责',
              self_evaluation: '润色后的自我评价',
              cover_letter: '专业求职信',
            };
            return keys[sceneId];
          };
          const polishKey = getPolishKey(scene.id);

          return (
            <div key={scene.id} className="preview-section">
              <h2 className="section-title">
                <span className="section-icon">✨</span>
                {scene.name}
              </h2>
              <div className="module-content">
                {!module.confirmed ? (
                  <p className="empty-hint">
                    该模块未完成，请返回上一页完成
                  </p>
                ) : (
                  <textarea
                    className="module-textarea"
                    value={module.confirmed}
                    onChange={(e) =>
                      handleUpdateModule(scene.id, 'confirmed', e.target.value)
                    }
                    rows={8}
                    placeholder={scene.description}
                  />
                )}
              </div>
            </div>
          );
        })}

      {/* 操作按钮 */}
      <div className="action-section">
        {hasValidCache ? (
          <>
            <div className="cache-hint">
              <div className="cache-icon">✓</div>
              <div className="cache-content">
                <div className="cache-title">报告已就绪</div>
                <div className="cache-desc">检测到已生成的体检报告，内容未变动可直接查看</div>
              </div>
            </div>
            <button
              className="confirm-button"
              onClick={() => router.push('/tools/career/career-checkup/report')}
            >
              查看体检报告
            </button>
          </>
        ) : (
          <button
            className="confirm-button"
            onClick={handleConfirmAndGenerate}
            disabled={generating}
          >
            {generating ? '生成中...' : '确认无误，生成体检报告'}
          </button>
        )}
      </div>

      <style jsx>{`
        .report-preview {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e0e0e0;
          border-top-color: #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .preview-header {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-block;
          color: #3498db;
          text-decoration: none;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .preview-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .preview-subtitle {
          color: #666;
          font-size: 1.1rem;
        }

        .preview-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }

        .section-icon {
          font-size: 1.5rem;
        }

        .profile-display {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .profile-item {
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .profile-label {
          font-weight: 500;
          color: #666;
          margin-right: 0.5rem;
        }

        .profile-value {
          color: #1a1a1a;
          font-weight: 600;
        }

        .module-content {
          min-height: 100px;
        }

        .empty-hint {
          color: #999;
          text-align: center;
          padding: 2rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .module-textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          line-height: 1.6;
          resize: vertical;
          background: #fafafa;
        }

        .module-textarea:focus {
          outline: none;
          border-color: #3498db;
          background: white;
        }

        .module-textarea[readonly] {
          background: #f0f0f0;
          cursor: default;
        }

        .project-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .project-item {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .project-number {
          font-weight: 600;
          color: #3498db;
          margin-bottom: 1rem;
        }

        .project-hint {
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: #999;
          text-align: right;
        }

        .action-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          text-align: center;
          position: relative;
        }

        .action-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 3px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 0 0 3px 3px;
        }

        .cache-hint {
          background: linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%);
          border: 1px solid #e0d4fc;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          text-align: left;
        }

        .cache-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          font-weight: bold;
        }

        .cache-content {
          flex: 1;
        }

        .cache-title {
          font-size: 1rem;
          font-weight: 600;
          color: #5a4fcf;
          margin-bottom: 0.25rem;
        }

        .cache-desc {
          font-size: 0.9rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .confirm-button {
          display: inline-block;
          text-decoration: none;
          border: none;
          padding: 1rem 3rem;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.25);
          min-width: 220px;
          width: auto;
        }

        .confirm-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .confirm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .preview-title {
            font-size: 1.5rem;
          }

          .profile-display {
            grid-template-columns: 1fr;
          }

          .confirm-button {
            width: 100%;
            padding: 1rem 2rem;
          }
        }
      `}</style>
    </div>
  );
}
