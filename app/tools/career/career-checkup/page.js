'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { sceneList } from '../../../lib/resume-polish-scenes';
import { getExamplesBySceneId } from '../../../lib/resume-polish-examples';



export default function CareerCheckup() {
  const [userProfile, setUserProfile] = useState({
    years: '',
    role: '',
    city: '',
    salary: '',
  });
  const [selectedScene, setSelectedScene] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editableResult, setEditableResult] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showNotice, setShowNotice] = useState(true);

  // 读取通知关闭状态
  useEffect(() => {
    const noticeDismissed = localStorage.getItem('career-checkup-notice-dismissed');
    if (noticeDismissed) {
      setShowNotice(false);
    }
  }, []);

  // 项目经历多条目管理
  const [projectItems, setProjectItems] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // 查看详情的状态
  const [viewingProject, setViewingProject] = useState(null);

  // localStorage 数据结构：modules 对象
  const [modules, setModules] = useState({
    project_experience: { items: [] },
    work_responsibility: { original: '', confirmed: '', insight: '' },
    self_evaluation: { original: '', confirmed: '', insight: '' },
    cover_letter: { original: '', confirmed: '', insight: '' },
  });

  // 加载localStorage中的会话数据
  useEffect(() => {
    const saved = localStorage.getItem('career-checkup-session');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.profile) setUserProfile(data.profile);
      if (data.modules) setModules(data.modules);
    }
  }, []);

  // 保存会话数据
  useEffect(() => {
    const sessionData = {
      profile: userProfile,
      modules,
      timestamp: Date.now(),
    };
    localStorage.setItem('career-checkup-session', JSON.stringify(sessionData));
  }, [userProfile, modules]);

  const handlePolish = async () => {
    if (!inputText.trim()) {
      alert('请输入需要润色的文本');
      return;
    }

    setLoading(true);
    setResult(null);
    setEditableResult('');

    try {
      const response = await fetch('/api/resume-polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          scene: selectedScene.id,
          userProfile,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 解析返回结果（润色结果 + 洞察）
        const polishedResult = parseResult(data.result);
        setResult(polishedResult);

        // 提取润色结果到可编辑 textarea
        const polishKey = getPolishKey(selectedScene.id);
        if (polishedResult[polishKey]) {
          setEditableResult(polishedResult[polishKey]);
        }
      } else {
        alert('处理失败：' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getPolishKey = (sceneId) => {
    const keys = {
      project_experience: '润色后的项目经历',
      work_responsibility: '润色后的工作职责',
      self_evaluation: '润色后的自我评价',
      cover_letter: '专业求职信',
    };
    return keys[sceneId];
  };

  const getInsightKey = (sceneId) => {
    const keys = {
      project_experience: '面试高频问题预测',
      work_responsibility: '岗位能力盲区扫描',
      self_evaluation: '核心卖点画像',
      cover_letter: '竞争力评估',
    };
    return keys[sceneId];
  };

  const handleConfirmResult = () => {
    if (!result) return;

    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'career' })
    }).catch(() => { });

    const polishKey = getPolishKey(selectedScene.id);
    const insightKey = getInsightKey(selectedScene.id);

    if (selectedScene.id === 'project_experience') {
      // 项目经历：多条目管理
      const newItem = {
        id: currentProjectId || Date.now(),
        original: inputText,
        confirmed: editableResult,
        insight: result[insightKey] || '',
        timestamp: Date.now(),
      };

      setModules((prev) => ({
        ...prev,
        project_experience: {
          ...prev.project_experience,
          items: [...prev.project_experience.items, newItem],
        },
      }));

      setCurrentProjectId(null);
    } else {
      // 其他模块：单条目
      setModules((prev) => ({
        ...prev,
        [selectedScene.id]: {
          original: inputText,
          confirmed: editableResult,
          insight: result[insightKey] || '',
          timestamp: Date.now(),
        },
      }));
    }

    // 重置状态
    setInputText('');
    setResult(null);
    setEditableResult('');
    alert('已确认采用此结果！');
  };

  const handleEditProject = (item) => {
    setEditingProjectId(item.id);
    setInputText(item.original);
    setEditableResult(item.confirmed);
    setCurrentProjectId(item.id);
    setSelectedScene(sceneList.find((s) => s.id === 'project_experience'));

    // 恢复洞察结果
    const insightKey = getInsightKey('project_experience');
    setResult({
      [getPolishKey('project_experience')]: item.confirmed,
      [insightKey]: item.insight,
    });
  };

  const handleDeleteProject = (itemId) => {
    if (confirm('确认删除这个项目经历？')) {
      setModules((prev) => ({
        ...prev,
        project_experience: {
          ...prev.project_experience,
          items: prev.project_experience.items.filter((item) => item.id !== itemId),
        },
      }));
    }
  };

  const handleAddNewProject = () => {
    setCurrentProjectId(null);
    setEditingProjectId(null);
    setInputText('');
    setEditableResult('');
    setResult(null);
    setViewingProject(null);
  };

  const parseResult = (text) => {
    // 解析API返回的结果，分割润色内容和洞察内容
    const sections = text.split(/===\s*(.*?)\s*===/);
    const result = {};

    for (let i = 1; i < sections.length; i += 2) {
      const sectionName = sections[i].trim();
      const sectionContent = sections[i + 1]?.trim() || '';
      result[sectionName] = sectionContent;
    }

    return result;
  };

  const rotateExample = () => {
    if (selectedScene) {
      const examples = getExamplesBySceneId(selectedScene.id);
      setExampleIndex((prev) => (prev + 1) % examples.length);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const isModuleCompleted = (sceneId) => {
    if (sceneId === 'project_experience') {
      return modules.project_experience.items.length > 0;
    }
    return !!modules[sceneId].confirmed;
  };

  // 处理点击场景卡片
  const handleSceneClick = (scene) => {
    setSelectedScene(scene);

    // 如果是已完成的非项目经历模块，还原之前的结果
    if (scene.id !== 'project_experience' && isModuleCompleted(scene.id)) {
      const moduleData = modules[scene.id];
      const polishKey = getPolishKey(scene.id);
      const insightKey = getInsightKey(scene.id);

      setInputText(moduleData.original);
      setEditableResult(moduleData.confirmed);
      setResult({
        [polishKey]: moduleData.confirmed,
        [insightKey]: moduleData.insight,
      });
    } else if (scene.id === 'project_experience' && editingProjectId) {
      // 项目经历：如果有正在编辑的项目，保持编辑状态
      const editingItem = modules.project_experience.items.find(item => item.id === editingProjectId);
      if (editingItem) {
        setInputText(editingItem.original);
        setEditableResult(editingItem.confirmed);
        const insightKey = getInsightKey('project_experience');
        setResult({
          [getPolishKey('project_experience')]: editingItem.confirmed,
          [insightKey]: editingItem.insight,
        });
      }
    }
  };

  const handleDismissNotice = () => {
    setShowNotice(false);
    localStorage.setItem('career-checkup-notice-dismissed', 'true');
  };

  const handleResetAllData = () => {
    if (!confirm('⚠️ 确认重置？\n\n将清空所有已保存的润色内容和设置，包括：\n• 个人画像信息\n• 各模块润色结果\n• 通知条偏好\n\n此操作不可撤销。')) {
      return;
    }
    if (!confirm('再次确认：确定要清空所有数据吗？')) {
      return;
    }
    // 清除 localStorage
    localStorage.removeItem('career-checkup-session');
    localStorage.removeItem('career-checkup-notice-dismissed');
    localStorage.removeItem('career-checkup-report-cache');
    // 重置 state
    // setUserProfile({});
    // setModules({
    //   project_experience: { items: [] },
    //   work_responsibility: { original: '', confirmed: '', insight: '' },
    //   self_evaluation: { original: '', confirmed: '', insight: '' },
    //   cover_letter: { original: '', confirmed: '', insight: '' },
    // });
    // setShowNotice(true);
    // 刷新页面
    window.location.reload();
  };


  const allModulesCompleted =
    modules.project_experience.items.length > 0 &&
    modules.work_responsibility.confirmed &&
    modules.self_evaluation.confirmed &&
    modules.cover_letter.confirmed;

  const examples = selectedScene ? getExamplesBySceneId(selectedScene.id) : [];

  return (
    <div className="career-checkup">
      {/* 通知条 */}
      {showNotice && (
        <div className="notice-bar">
          <div className="notice-content">
            <span className="notice-icon">💡</span>
            <span className="notice-text">
              建议使用PC端浏览器访问，体验更佳。所有数据仅保存于浏览器本地，仅在需要时发送至大模型处理。
            </span>
          </div>
          <button className="notice-close" onClick={handleDismissNotice}>
            ✕
          </button>
        </div>
      )}

      <div className="checkup-header">
        <div className="header-top">
          <Link href="/tools/career" className="back-link" style={{
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
          }}>
            ← 返回职场工具箱
          </Link>

          <button className="reset-data-btn" onClick={handleResetAllData}>
            重置数据
          </button></div>
        <h1 className="checkup-title">🩺 求职体检</h1>
        <p className="checkup-subtitle">
          AI诊断你的求职准备度，给出个性化优化建议
        </p>
      </div>

      {/* 步骤1: 个人画像 */}
      <div className="checkup-section">
        <h2 className="section-title">
          <span className="step-number">1</span>
          个人画像（可选）
        </h2>
        <div className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label>工作年限</label>
              <select
                value={userProfile.years}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, years: e.target.value })
                }
              >
                <option value="">请选择</option>
                <option value="应届生">应届生</option>
                <option value="1年以内">1年以内</option>
                <option value="1-3年">1-3年</option>
                <option value="3-5年">3-5年</option>
                <option value="5-10年">5-10年</option>
                <option value="10年以上">10年以上</option>
              </select>
            </div>
            <div className="form-group">
              <label>当前岗位</label>
              <input
                type="text"
                placeholder="如：前端开发"
                value={userProfile.role}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, role: e.target.value })
                }
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>工作城市</label>
              <input
                type="text"
                placeholder="如：上海"
                value={userProfile.city}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, city: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>期望薪资</label>
              <input
                type="text"
                placeholder="如：15k"
                value={userProfile.salary}
                onChange={(e) =>
                  setUserProfile({ ...userProfile, salary: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* 步骤2: 选择润色场景 */}
      <div className="checkup-section">
        <h2 className="section-title">
          <span className="step-number">2</span>
          选择要润色的模块
        </h2>
        <div className="scene-grid">
          {sceneList.map((scene) => (
            <div
              key={scene.id}
              className={`scene-card ${selectedScene?.id === scene.id ? 'active' : ''
                } ${isModuleCompleted(scene.id) ? 'completed' : ''}`}
              onClick={() => handleSceneClick(scene)}
            >
              {isModuleCompleted(scene.id) && (
                <div className="completed-badge">✓</div>
              )}
              <h3 className="scene-name">{scene.name}</h3>
              <p className="scene-desc">{scene.description}</p>
              {scene.insightTitle && (
                <div className="insight-preview">
                  💡 {scene.insightTitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤3: 输入和润色 */}
      {selectedScene && (
        <div className="checkup-section">
          <h2 className="section-title">
            <span className="step-number">3</span>
            {selectedScene.name}
            {selectedScene.id === 'project_experience' && (
              <span className="project-count">
                (已确认 {modules.project_experience.items.length} 个项目)
              </span>
            )}
          </h2>

          {/* 项目经历：多条目列表 */}
          {selectedScene.id === 'project_experience' &&
            modules.project_experience.items.length > 0 && (
              <div className="project-items-list">
                {modules.project_experience.items.map((item) => (
                  <div key={item.id} className="project-item-card">
                    <div className="project-item-header">
                      <span className="project-item-title">
                        {item.confirmed.split('\n')[0]?.substring(0, 50)}...
                      </span>
                      <div className="project-item-actions">
                        <button
                          className="action-btn view-btn"
                          onClick={() => setViewingProject(item.id)}
                        >
                          查看
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditProject(item)}
                        >
                          编辑
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteProject(item.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  className="add-project-btn"
                  onClick={handleAddNewProject}
                >
                  + 添加新项目
                </button>

                {/* 查看项目详情的内联展示 */}
                {viewingProject && (() => {
                  const item = modules.project_experience.items.find(i => i.id === viewingProject);
                  if (!item) return null;
                  const insightKey = getInsightKey('project_experience');
                  return (
                    <div className="project-view-detail">
                      <div className="view-detail-header">
                        <h3>📄 项目详情</h3>
                        <button
                          className="close-view-btn"
                          onClick={() => setViewingProject(null)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="view-detail-content">
                        <div className="view-section">
                          <h4>原始文本</h4>
                          <div className="view-text">{item.original}</div>
                        </div>
                        <div className="view-section">
                          <h4>润色结果</h4>
                          <div className="view-text">{item.confirmed}</div>
                        </div>
                        {item.insight && (
                          <div className="view-section insight-section">
                            <h4>💡 洞察分析</h4>
                            <div className="view-text">{item.insight}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
             

          {/* 示例轮播 */}
          {examples.length > 0 && (
            <div className="example-section">
              <div className="example-header">
                <span>示例对比（点击切换）</span>
                <button className="rotate-btn" onClick={rotateExample}>
                  🔄 切换示例
                </button>
              </div>
              <div className="example-comparison">
                <div className="example-box before">
                  <h4>原始文本</h4>
                  <p>{examples[exampleIndex].before}</p>
                </div>
                <div className="example-arrow">→</div>
                <div className="example-box after">
                  <h4>润色后</h4>
                  <p>{examples[exampleIndex].after}</p>
                </div>
              </div>
            </div>
          )}

          <div className="editor-container">
            <div className="editor-box">
              <textarea
                className="input-textarea"
                placeholder={getPlaceholder(selectedScene.id)}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={selectedScene.inputLimit}
              />
              <div className="char-count">
                {inputText.length} / {selectedScene.inputLimit}
              </div>
            </div>
            <button
              className="polish-button"
              onClick={handlePolish}
              disabled={loading}
            >
              {loading ? '润色中...' : '一键润色'}
            </button>
          </div>

          {/* 结果展示 */}
          {result && (
            <div className="result-container">
              {/* 润色结果（可编辑） */}
              <div className="result-section">
                <div className="result-header">
                  <h3>✨ 润色结果（可编辑）</h3>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(editableResult)}
                  >
                    复制
                  </button>
                </div>
                <textarea
                  className="result-textarea"
                  value={editableResult}
                  onChange={(e) => setEditableResult(e.target.value)}
                  rows={10}
                />
                <div className="result-actions">
                  <button
                    className="clear-button"
                    onClick={() => {
                      setInputText('');
                      setResult(null);
                      setEditableResult('');
                      setViewingProject(null);
                      if (selectedScene.id === 'project_experience') {
                        setEditingProjectId(null);
                        setCurrentProjectId(null);
                      }
                    }}
                  >
                    🗑️ 清空重写
                  </button>
                  <button
                    className="confirm-button"
                    onClick={handleConfirmResult}
                  >
                    ✓ 确认采用此结果
                  </button>
                </div>
              </div>

              {/* Aha洞察 */}
              {result['面试高频问题预测'] && (
                <div className="result-section insight-section">
                  <div className="result-header">
                    <h3>💡 {selectedScene.insightTitle}</h3>
                  </div>
                  <div className="result-content">
                    <pre>{result['面试高频问题预测']}</pre>
                  </div>
                </div>
              )}

              {result['岗位能力盲区扫描'] && (
                <div className="result-section insight-section">
                  <div className="result-header">
                    <h3>💡 {selectedScene.insightTitle}</h3>
                  </div>
                  <div className="result-content">
                    <pre>{result['岗位能力盲区扫描']}</pre>
                  </div>
                </div>
              )}

              {result['核心卖点画像'] && (
                <div className="result-section insight-section">
                  <div className="result-header">
                    <h3>💡 {selectedScene.insightTitle}</h3>
                  </div>
                  <div className="result-content">
                    <pre>{result['核心卖点画像']}</pre>
                  </div>
                </div>
              )}

              {result['竞争力评估'] && (
                <div className="result-section insight-section">
                  <div className="result-header">
                    <h3>💡 {selectedScene.insightTitle}</h3>
                  </div>
                  <div className="result-content">
                    <pre>{result['竞争力评估']}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 进度提示 */}
      {allModulesCompleted ? (
        <div className="progress-bar completed">
          <div className="progress-label">🎉 所有模块已完成！</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '100%' }} />
          </div>
          <div className="report-action">
            <Link
              href="/tools/career/career-checkup/report-preview"
              className="generate-report-button"
            >
              查看确认页，生成体检报告 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="progress-bar">
          <div className="progress-label">
            已完成{' '}
            {[
              isModuleCompleted('project_experience') ? 1 : 0,
              isModuleCompleted('work_responsibility') ? 1 : 0,
              isModuleCompleted('self_evaluation') ? 1 : 0,
              isModuleCompleted('cover_letter') ? 1 : 0,
            ].reduce((a, b) => a + b, 0)}{' '}
            / 4 个模块
          </div>
          <div
            className="progress-track"
            style={{
              width: `${([
                isModuleCompleted('project_experience') ? 1 : 0,
                isModuleCompleted('work_responsibility') ? 1 : 0,
                isModuleCompleted('self_evaluation') ? 1 : 0,
                isModuleCompleted('cover_letter') ? 1 : 0,
              ].reduce((a, b) => a + b, 0) /
                4) *
                100
                }%`,
            }}
          >
            <div
              className="progress-fill"
              style={{
                width: `${([
                  isModuleCompleted('project_experience') ? 1 : 0,
                  isModuleCompleted('work_responsibility') ? 1 : 0,
                  isModuleCompleted('self_evaluation') ? 1 : 0,
                  isModuleCompleted('cover_letter') ? 1 : 0,
                ].reduce((a, b) => a + b, 0) /
                  4) *
                  100
                  }%`,
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .career-checkup {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        /* 通知条样式 */
        .notice-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notice-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .notice-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .notice-text {
          font-size: 0.95rem;
          line-height: 1.5;
          font-weight: 500;
        }

        .notice-close {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .notice-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 768px) {
          .notice-bar {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
          }

          .notice-content {
            flex-direction: column;
            gap: 0.5rem;
          }

          .notice-close {
            width: 28px;
            height: 28px;
            font-size: 1rem;
            position: absolute;
            top: 8px;
            right: 8px;
          }

          .notice-bar {
            position: relative;
            padding-top: 2rem;
            padding-bottom: 1rem;
          }
        }

        .checkup-header {
          margin-bottom: 2rem;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }


        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 20px;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .back-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .reset-data-btn {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          color: #6c757d;
          font-size: 0.85rem;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .reset-data-btn:hover {
          color: #e74c3c;
          border-color: #e74c3c;
          background: rgba(231, 76, 60, 0.08);
          box-shadow: 0 2px 8px rgba(231, 76, 60, 0.2);
        }


        .checkup-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .checkup-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .checkup-section {
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
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }

        .step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: #3498db;
          color: white;
          border-radius: 50%;
          font-weight: 700;
          font-size: 1rem;
        }

        .project-count {
          font-size: 0.9rem;
          color: #666;
          margin-left: 0.5rem;
          font-weight: 400;
        }

        /* 项目条目列表 */
        .project-items-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .project-item-card {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
        }

        .project-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .project-item-title {
          font-weight: 500;
          color: #333;
          flex: 1;
        }

        .project-item-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }

        .view-btn {
          background: #3498db;
          color: white;
        }

        .view-btn:hover {
          background: #2980b9;
        }

        .edit-btn {
          background: #e67e22;
          color: white;
        }

        .edit-btn:hover {
          background: #d35400;
        }

        .delete-btn {
          background: #e74c3c;
          color: white;
        }

        .delete-btn:hover {
          background: #c0392b;
        }

        .add-project-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .add-project-btn:hover {
          background: #45a049;
        }

        /* 项目查看详情 */
        .project-view-detail {
          background: #f0f7ff;
          border: 2px solid #3498db;
          border-radius: 10px;
          padding: 1.5rem;
          margin-top: 1rem;
          animation: slideDown 0.3s ease-out;
        }

        .view-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #d0e3ff;
        }

        .view-detail-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .close-view-btn {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .close-view-btn:hover {
          background: rgba(52, 152, 219, 0.2);
        }

        .view-detail-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .view-section {
          background: white;
          border-radius: 8px;
          padding: 1rem;
        }

        .view-section h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #555;
          margin: 0 0 0.75rem 0;
        }

        .view-section.insight-section {
          background: #fff8e1;
          border: 1px solid #ffc107;
        }

        .view-text {
          line-height: 1.8;
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        /* 个人画像表单 */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: #333;
          font-size: 0.95rem;
        }

        .form-group select,
        .form-group input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group select:focus,
        .form-group input:focus {
          outline: none;
          border-color: #3498db;
        }

        /* 场景卡片 */
        .scene-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .scene-card {
          background: #f8f9fa;
          border: 2px solid transparent;
          border-radius: 10px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .scene-card:hover {
          border-color: #3498db;
          transform: translateY(-2px);
        }

        .scene-card.active {
          border-color: #3498db;
          background: #e3f2fd;
        }

        .scene-card.completed {
          border-color: #4caf50;
        }

        .completed-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 24px;
          height: 24px;
          background: #4caf50;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .scene-name {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .scene-desc {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.75rem;
        }

        .insight-preview {
          font-size: 0.85rem;
          color: #e67e22;
          font-weight: 500;
        }

        /* 示例对比 */
        .example-section {
          background: #fafafa;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .example-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-weight: 600;
          color: #555;
        }

        .rotate-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .rotate-btn:hover {
          background: #2980b9;
        }

        .example-comparison {
          display: flex;
          align-items: stretch;
          gap: 1rem;
        }

        .example-box {
          flex: 1;
          background: white;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .example-box h4 {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.75rem;
        }

        .example-box p {
          font-size: 0.9rem;
          color: #333;
          line-height: 1.6;
        }

        .example-box.after {
          background: #f0f7ff;
        }

        .example-arrow {
          display: flex;
          align-items: center;
          font-size: 1.5rem;
          color: #3498db;
        }

        /* 编辑器容器 */
        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .editor-box {
          position: relative;
        }

        .input-textarea {
          width: 100%;
          min-height: 200px;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .input-textarea:focus {
          outline: none;
          border-color: #3498db;
        }

        .char-count {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 0.85rem;
          color: #999;
          background: rgba(255, 255, 255, 0.9);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .polish-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .polish-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .polish-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 结果容器 */
        .result-container {
          margin-top: 2rem;
        }

        .result-section {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .result-section.insight-section {
          background: #fff8e1;
          border: 1px solid #ffc107;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .result-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .copy-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.4rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .copy-btn:hover {
          background: #2980b9;
        }

        .result-content {
          line-height: 1.8;
          color: #333;
          white-space: pre-wrap;
        }

        .result-content pre {
          margin: 0;
          font-family: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: break-word;
        }

        .result-textarea {
          width: 100%;
          min-height: 200px;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          line-height: 1.6;
          background: white;
        }

        .result-textarea:focus {
          outline: none;
          border-color: #3498db;
        }

        .result-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }

        .confirm-button {
          background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .confirm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .clear-button {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          color: #6c757d;
          font-size: 0.95rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .clear-button:hover {
          color: #e74c3c;
          border-color: #e74c3c;
          background: rgba(231, 76, 60, 0.08);
          box-shadow: 0 2px 8px rgba(231, 76, 60, 0.2);
        }

        /* 进度条 */
        .progress-bar {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .progress-bar.completed {
          background: #f0f9ff;
          border: 2px solid #4caf50;
        }

        .progress-label {
          font-weight: 600;
          color: #333;
          margin-bottom: 0.75rem;
        }

        .progress-track {
          height: 10px;
          background: #e0e0e0;
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
          transition: width 0.3s ease;
        }

        .report-action {
          margin-top: 1.5rem;
          text-align: center;
        }

        .generate-report-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1.1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .generate-report-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 768px) {
          .example-comparison {
            flex-direction: column;
          }

          .example-arrow {
            transform: rotate(90deg);
            justify-content: center;
            padding: 0.5rem 0;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function getPlaceholder(sceneId) {
  const placeholders = {
    project_experience:
      '粘贴你的原始项目描述...\n\n例如：我负责了一个系统开发，用了React和Node.js，让大家的效率提高了',
    work_responsibility:
      '粘贴你的工作职责描述...\n\n例如：每天要做很多事情，管好团队，跟客户沟通，保证项目按时交付',
    self_evaluation:
      '粘贴你的自我评价...\n\n例如：我做事认真，学习能力比较强，能团队合作',
    cover_letter:
      '描述你的求职意向和基本情况...\n\n例如：我想应聘你们公司的前端岗位，我有3年经验，希望能有机会',
  };
  return placeholders[sceneId] || '请输入文本...';
}
