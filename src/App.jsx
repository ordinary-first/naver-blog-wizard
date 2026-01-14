import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './index.css';

const App = () => {
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState([]); // Array of {type: 'text'|'image'|'map', value: string, details?: any}
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState('일상');
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoScore, setSeoScore] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
    searchClientId: import.meta.env.VITE_NAVER_SEARCH_CLIENT_ID || '',
    searchClientSecret: import.meta.env.VITE_NAVER_SEARCH_CLIENT_SECRET || '',
    ncpClientId: import.meta.env.VITE_NAVER_NCP_CLIENT_ID || ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('wizard_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setApiKeys(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  const saveKeys = () => {
    localStorage.setItem('wizard_api_keys', JSON.stringify(apiKeys));
    setShowSettings(false);
    alert('설정이 저장되었습니다.');
  };

  const categories = [
    { id: '먹거리', icon: '🍲', placeholder: '식당 이름을 검색해보세요' },
    { id: '여행', icon: '✈️', placeholder: '여행지를 입력해보세요' },
    { id: '일상', icon: '🏠', placeholder: '오늘의 조각' },
    { id: '기타', icon: '📑', placeholder: '자유로운 기록' }
  ];

  const handlePlaceSearch = async (query) => {
    if (!query) {
      alert('검색어를 입력해주세요.');
      return;
    }

    if (!apiKeys.searchClientId || !apiKeys.searchClientSecret) {
      console.warn('API keys are missing in the configuration.');
      return;
    }

    setIsSearchingPlace(true);

    try {
      // Using the Vite proxy /v1 configured in vite.config.js
      const response = await fetch(`/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`, {
        headers: {
          'X-Naver-Client-Id': apiKeys.searchClientId.trim(),
          'X-Naver-Client-Secret': apiKeys.searchClientSecret.trim()
        }
      });

      if (response.status === 401) {
        throw new Error('401 Unauthorized: API 키가 틀리거나 권한이 없습니다.');
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        // Transform the mock-like structure but with real data
        // API returns mapx, mapy in KATECH coordinates
        setSearchResults(data.items.map(item => ({
          name: item.title.replace(/<[^>]*>?/gm, ''),
          address: item.roadAddress || item.address,
          mapx: item.mapx,
          mapy: item.mapy,
          category: item.category,
          link: item.link,
          // Add some dummy descriptions for the AI to use if it wants
          features: ['분위기 맛집', '실방문자 추천'],
          info: item.description || '네이버에서 제공하는 장소 정보입니다.',
          route: '네이버 지도를 참고해주세요.'
        })));
      } else {
        alert('검색 결과가 없습니다.');
      }
    } catch (error) {
      console.error('Search Error:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file: file
    }));
    setImages([...images, ...newImages]);

    // Auto-insert image into content if empty
    if (content.length === 0) {
      setContent(newImages.map(img => ({ type: 'image', value: img.url })));
    }
  };

  const generateAIContent = async () => {
    if (!apiKeys.gemini) {
      alert('설정에서 Gemini API 키를 먼저 등록해주세요!');
      setShowSettings(true);
      return;
    }

    if (images.length === 0) {
      alert('먼저 사진을 업로드해주세요!');
      return;
    }

    setIsGenerating(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKeys.gemini);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        당신은 네이버 블로그 전문 마케터이자 전문 블로거입니다. 
        사용자가 제공한 정보를 바탕으로 네이버 검색 결과 상단에 노출될 수 있는 '최적화된 블로그 포스팅'을 작성하세요.

        [입력 정보]
        - 카테고리: ${category}
        - 장소: ${selectedPlace ? selectedPlace.name : '없음'}
        - 주소: ${selectedPlace ? selectedPlace.address : '없음'}
        - 사진 개수: ${images.length}장

        [작성 가이드라인]
        1. 제목: 클릭을 부르는 매력적인 제목을 작성하세요. (대괄호 [], 이모지 활용, 키워드 포함)
        2. 본문 구조: 
           - 도입부 (공감대 형성, 방문/경험 배경)
           - 소제목 (## 로 표시)
           - 상세 설명 (다이아 로직에 맞게 직접 경험한 듯한 생생한 말투)
           - 맺음말 (공감, 댓글 유도)
        3. 말투: 친절하고 정보전달이 확실한 '~해요', '~입니다' 체를 섞어서 사용하세요.
        4. 내용: 네이버 DIA+ 로직에 따라 체류 시간을 늘릴 수 있도록 상세하게 기술하세요.
        5. 태그: 관련 있는 해시태그 5~10개를 제안하세요.

        [출력 형식 (JSON 중요!)]
        반드시 아래 JSON 형식으로만 답변하세요. 다른 설명은 금지입니다.
        {
          "title": "제목",
          "content": [
            {"type": "text", "value": "내용1..."},
            {"type": "text", "value": "내용2..."}
          ],
          "tags": ["태그1", "태그2"]
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Extract JSON if AI includes conversational text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      // Remove markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const data = JSON.parse(text);

      // Distribute images between text blocks
      const finalContent = [];
      const imageBatchSize = Math.ceil(images.length / Math.max(1, data.content.length));

      data.content.forEach((item, idx) => {
        finalContent.push(item);
        // Insert a few images after each text block
        const start = idx * imageBatchSize;
        const end = Math.min(start + imageBatchSize, images.length);
        for (let i = start; i < end; i++) {
          finalContent.push({ type: 'image', value: images[i].url });
        }
      });

      setTitle(data.title);
      setContent(finalContent);
      setTags(data.tags);
      calculateSEO(data.title, finalContent);
    } catch (error) {
      console.error('AI Generation Error:', error);
      alert('글 생성 중 오류가 발생했습니다. API 키를 확인하거나 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateSEO = (t, c) => {
    let score = 0;
    if (t.length > 10) score += 30;
    if (images.length >= 3) score += 30;
    const textLength = c.filter(item => item.type === 'text').reduce((acc, curr) => acc + curr.value.length, 0);
    if (textLength > 500) score += 40;
    setSeoScore(score);
  };

  const copyToClipboard = () => {
    const text = `${title}\n\n${content.map(c => c.type === 'text' ? c.value : '[이미지 삽입]').join('\n\n')}\n\n태그: ${tags.map(t => '#' + t).join(' ')}`;
    navigator.clipboard.writeText(text);
    alert('블로그 내용이 클립보드에 복사되었습니다! 네이버 에디터에 붙여넣으세요.');
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="reveal">
          <h1 className="premium-gradient" style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Naver Blog Wizard</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>AI가 제안하는 최신 트렌드 블로그 포스팅</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="button-hover glass"
            onClick={() => setShowSettings(true)}
            style={{ padding: '0.8rem 1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>⚙️</span> API 설정
          </button>
          <div className="glass floating" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: seoScore > 70 ? 'var(--naver-green)' : '#f59e0b' }}></div>
            <span style={{ fontWeight: '600' }}>SEO Optimization: {seoScore}%</span>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {categories.map(cat => (
          <div
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`glass button-hover ${category === cat.id ? 'active-card' : ''}`}
            style={{
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              border: category === cat.id ? '2px solid var(--naver-green)' : '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{cat.icon}</div>
            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{cat.id}</div>
          </div>
        ))}
      </div>

      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass reveal" style={{ width: '450px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>🎯 맞춤 설정</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>사용자 기반의 최적화된 블로그 작성을 위한 설정입니다.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>선호하는 말투</label>
                <select className="glass" style={{ width: '100%', padding: '0.8rem', color: 'white' }}>
                  <option>친절하고 다정한 말투 (~해요)</option>
                  <option>전문적이고 깔끔한 말투 (~입니다)</option>
                  <option>감성적이고 일상적인 말투</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
              <button className="button-hover" style={{ flex: 1, padding: '1rem', background: 'var(--naver-green)', color: 'white', fontWeight: '700' }} onClick={() => setShowSettings(false)}>저장하기</button>
              <button className="button-hover glass" style={{ flex: 1, padding: '1rem', color: 'white' }} onClick={() => setShowSettings(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '2.5rem' }}>
        <section className="glass reveal" style={{ padding: '2.5rem', position: 'relative' }}>
          {/* Location Search Bar - Show for Travel/Food */}
          {(category === '먹거리' || category === '여행') && !selectedPlace && (
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder={categories.find(c => c.id === category)?.placeholder}
                className="glass"
                style={{ flex: 1, padding: '1rem' }}
                onKeyPress={(e) => e.key === 'Enter' && handlePlaceSearch(e.target.value)}
              />
              <button
                className="button-hover"
                style={{ background: 'var(--naver-green)', color: 'white', padding: '0 1.5rem', fontWeight: 'bold' }}
                onClick={(e) => handlePlaceSearch(e.target.previousSibling.value)}
              >
                위치 검색
              </button>
            </div>
          )}

          {/* Selected Place Detail Check */}
          {selectedPlace && (
            <div className="glass" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--naver-green)' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--accent)' }}>📍 {selectedPlace.name}</h4>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'var(--text-dim)' }}>{selectedPlace.address}</p>
              </div>
              <button onClick={() => setSelectedPlace(null)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}>취소</button>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !selectedPlace && (
            <div className="glass reveal" style={{ marginBottom: '2rem', maxHeight: '200px', overflowY: 'auto' }}>
              {searchResults.map((p, i) => (
                <div
                  key={i}
                  className="button-hover"
                  style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedPlace(p);
                    setSearchResults([]);
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{p.address}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: '2.5rem' }}>
            <input
              type="text"
              placeholder="블로그 제목 (AI가 추천해드립니다)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
              style={{ width: '100%', fontSize: '2.2rem', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', fontWeight: '700', borderRadius: 0 }}
            />
          </div>

          <div className="content-area" style={{ minHeight: '500px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '1rem' }}>
            {content.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ background: 'rgba(3, 199, 90, 0.1)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '3rem' }}>📸</span>
                </div>
                <h2 style={{ marginBottom: '0.5rem' }}>오늘의 사진을 올려주세요</h2>
                <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', textAlign: 'center' }}>사진만 넣으면 AI가 네이버 블로그 트렌드에 <br />완벽하게 맞춘 글을 작성해드립니다.</p>
                <label className="button button-hover" style={{ background: 'var(--naver-green)', padding: '16px 32px', fontSize: '1.1rem', fontWeight: '600', color: 'white' }}>
                  사진 선택하기
                  <input type="file" multiple hidden onChange={handleImageUpload} />
                </label>
              </div>
            ) : (
              content.map((item, index) => (
                <div key={index} style={{ marginBottom: '2rem' }}>
                  {item.type === 'text' ? (
                    <textarea
                      value={item.value}
                      onChange={(e) => {
                        const newContent = [...content];
                        newContent[index].value = e.target.value;
                        setContent(newContent);
                      }}
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.15rem',
                        color: '#e2e8f0',
                        resize: 'none',
                        lineHeight: '1.8',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={item.url || item.value} alt="uploaded" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', margin: '1rem 0' }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {content.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {tags.map((tag, i) => (
                <span key={i} style={{ background: 'rgba(3, 199, 90, 0.15)', padding: '6px 16px', borderRadius: '30px', fontSize: '0.95rem', color: 'var(--accent)', fontWeight: '500' }}>#{tag}</span>
              ))}
            </div>
          )}
        </section>

        <aside className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✨</span> AI 생성 엔진
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
              네이버 C-Rank와 DIA+ 로직을 분석하여 가장 노출이 잘 되는 구조로 작성을 시작합니다.
            </p>
            <button
              className="button-hover"
              onClick={generateAIContent}
              disabled={isGenerating || images.length === 0}
              style={{
                width: '100%',
                background: 'var(--naver-green)',
                color: 'white',
                padding: '1.2rem',
                fontWeight: '700',
                fontSize: '1.05rem',
                opacity: (isGenerating || images.length === 0) ? 0.5 : 1
              }}
            >
              {isGenerating ? 'AI 아날라이저 가동 중...' : '최신 트렌드 글 생성'}
            </button>
          </div>

          <div className="glass" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>SEO 최적화 리포트</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <CheckItem label="키워드 제목 배치" active={title.length > 20} />
              <CheckItem label="이미지 희소성 및 배치" active={images.length >= 3} />
              <CheckItem label="가독성 (소제목 활용)" active={content.length > 5} />
              <CheckItem label="충분한 체류시간 유도" active={seoScore > 80} />
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              className="button-hover"
              style={{ padding: '1.2rem', background: '#334155', color: 'white', fontWeight: '600' }}
              onClick={copyToClipboard}
            >
              전체 내용 복사하기
            </button>
            <button
              className="button-hover"
              style={{
                padding: '1.2rem',
                background: 'linear-gradient(135deg, #03c75a 0%, #02a84c 100%)',
                color: 'white',
                fontWeight: '800',
                boxShadow: '0 4px 20px rgba(3, 199, 90, 0.3)'
              }}
              onClick={() => alert('네이버 API 연동 가이드: developers.naver.com 에서 Client ID를 발급받아 환경 변수에 등록해야 합니다.')}
            >
              네이버 블로그 즉시 발행
            </button>
          </div>
        </aside>
      </main>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
        © 2026 Naver Blog Wizard. All rights reserved.
      </footer>
    </div>
  );
};

const CheckItem = ({ label, active }) => (
  <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: active ? 'white' : 'var(--text-dim)' }}>
    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: active ? 'var(--naver-green)' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
      {active ? '✓' : ''}
    </div>
    <span style={{ fontSize: '0.95rem' }}>{label}</span>
  </li>
);

export default App;
