// src/components/geometriccanvas.tsx
import { useRef, useEffect, useState } from 'react';

// パラメータの型定義
type Params = {
  mode: string;
  points: number;
  waves: number;
  waveHeight: number;
  baseRadius: number;
  rotationSpeed: number;
  waveSpeed: number;
  fadeOpacity: number;
  resolution: keyof typeof RESOLUTIONS;
  bgColor: string;
  strokeColor: string;
};

// 解像度の定義
const RESOLUTIONS = {
  // 基本（横長・壁紙向け）
  'FHD (1080p)': { w: 1920, h: 1080 },
  'WQHD (1440p)': { w: 2560, h: 1440 },
  '4K (2160p)': { w: 3840, h: 2160 },
  // 正方形（SNS投稿向け）
  'Square (2048×2048)': { w: 2048, h: 2048 },
  // スマホ縦（壁紙向け）
  'iPhone (1290×2796)': { w: 1290, h: 2796 },
  'Android (1080×2400)': { w: 1080, h: 2400 },
};

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

// ボタンの共通スタイル（プライマリ/セカンダリでhover・focus・disabledを統一）
const buttonBaseClass = "w-full px-2 py-2 rounded font-bold text-xs sm:text-sm whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] disabled:opacity-50 disabled:cursor-not-allowed";
const buttonPrimaryClass = `${buttonBaseClass} bg-[#00b259] hover:bg-[#00994d] text-white focus-visible:ring-[#00b259]`;
const buttonSecondaryClass = `${buttonBaseClass} border border-[#444444] hover:border-[#00b259] hover:text-[#00b259] text-gray-400 focus-visible:ring-[#00b259]`;

// ============================================

export const GeometricCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null); // ヘッダー〜パネルの空き領域（キャンバスの表示枠）
  const resizeCanvasRef = useRef<() => void>(() => { });
  const timeRef = useRef(0); // アニメーションの時間を保持

  // 初期状態
  const [params, setParams] = useState<Params>(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      mode: p.get('mode') ?? 'Chaos',
      points: Number(p.get('points') ?? 890),
      waves: Number(p.get('waves') ?? 7),
      waveHeight: Number(p.get('waveHeight') ?? 30),
      baseRadius: Number(p.get('baseRadius') ?? 226),
      rotationSpeed: Number(p.get('rotationSpeed') ?? -0.5),
      waveSpeed: Number(p.get('waveSpeed') ?? -6.6),
      fadeOpacity: Number(p.get('fadeOpacity') ?? 0.22),
      resolution: (p.get('resolution') ?? 'FHD (1080p)') as keyof typeof RESOLUTIONS,
      bgColor: p.get('bgColor') ?? '#1a1a1a',
      strokeColor: p.get('strokeColor') ?? '#00aaff',
    };
  });

  // モバイルでは初期状態を閉じておき、キャンバスの表示領域を優先する（デスクトップは常時表示のため影響しない）
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // 動画出力（WebM）関連の状態
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0); // 0〜1

  const paramsRef = useRef(params); //
  useEffect(() => {
    paramsRef.current = params;
    resizeCanvasRef.current();

    // URLを更新
    const p = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      p.set(key, String(value));
    });
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [params]);
  const canvasSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });

  // 描画ロジック（画面用とダウンロード用で使い回すため分離）
  const drawPath = (ctx: CanvasRenderingContext2D, w: number, h: number, currentParams: Params, time: number) => {
    ctx.fillStyle = `rgba(${hexToRgb(currentParams.bgColor)}, ${currentParams.fadeOpacity})`; // 残像効果
    ctx.fillRect(0, 0, w, h); // キャンバス全体を指定色で塗りつぶす

    ctx.save(); // 現在の状態を保存
    ctx.translate(w / 2, h / 2); // 原点を左上(デフォルト)→画面の中心に移動
    ctx.rotate(time * currentParams.rotationSpeed); // キャンバス全体を回転(経過時間×回転速度)

    ctx.beginPath(); // 新しいパスを開始
    // 色も時間経過で変わるように
    ctx.strokeStyle = currentParams.strokeColor;
    ctx.lineWidth = 2; // 線の太さ

    // iを0からpoints(頂点数)まで1ずつ増やす
    for (let i = 0; i <= currentParams.points; i++) {
      // angleが 0 から 2π まで一周
      const angle = (i / currentParams.points) * Math.PI * 2;

      let radius = currentParams.baseRadius; // 基本半径      
      let x = 0;
      let y = 0;
      // time × 速度の省略
      const t = time * currentParams.waveSpeed;

      // 20種類の描画アルゴリズム
      switch (currentParams.mode) {
        case 'Wave': // サイン波
          radius += Math.sin(angle * currentParams.waves + t) * currentParams.waveHeight;
          break;

        case 'Chaos': // タンジェント
          radius += Math.tan(angle * currentParams.waves + t) * currentParams.waveHeight;
          break;

        case 'Star': // 星型
          radius += (i % 2 === 0 ? currentParams.waveHeight : -currentParams.waveHeight) * Math.sin(time);
          break;

        case 'Rose': // バラ曲線
          // += ではなく = 、完全に上書き
          radius = currentParams.baseRadius * Math.sin(currentParams.waves * angle + t * 0.5);
          break;

        case 'Spirograph': // スピログラフ風(Waveとほぼ同じ)
          radius += currentParams.waveHeight * Math.cos(angle * (currentParams.waves * 2.5) + t);
          break;

        case 'Polygon': { // 多角形風（カクカクする）
          const sides = Math.max(3, currentParams.waves);
          const a = Math.PI / sides;
          radius = currentParams.baseRadius / Math.cos(a - (angle % (2 * a))) + Math.sin(t) * 20; // a から引くのはゼロ除算回避
          break;
        }

        case 'Butterfly': // 蝶の羽模様
          radius = currentParams.baseRadius * ( // Roseと同じく完全上書き
            Math.pow(Math.E, Math.cos(angle)) // 自然体数の底 e の-1~1乗(0.37 ~ 2.71)
            - 2 * Math.cos(currentParams.waves * angle)
            + Math.pow(Math.sin(angle / 12), 5)
          ) * 0.3;
          break;

        case 'Lissajous': // リサジュー図形
          // 媒介変数表示
          x = currentParams.baseRadius * Math.sin(currentParams.waves * angle + t);
          y = currentParams.baseRadius * Math.sin((currentParams.waves + 1) * angle);
          break; // xとyを直接計算したのでここでbreak

        case 'Web': // クモの巣
          radius += (i % Math.max(1, currentParams.waves) === 0 ? currentParams.waveHeight : 0) * Math.cos(t);
          break;

        case 'Heart': { // ハート型
          const r = currentParams.baseRadius * 0.1; // スケール調整
          x = r * 16 * Math.pow(Math.sin(angle), 3);
          y = -r * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
          // 波のエッセンスを加える(円軌道の平行移動)
          x += Math.sin(t) * currentParams.waveHeight * 0.1;
          y += Math.cos(t) * currentParams.waveHeight * 0.1;
          break;
        }

        case 'Epicycloid': { // エピサイクロイド(外側を転がる円の軌跡)
          const R = currentParams.baseRadius;
          const n = currentParams.waves + 2; // カスプ(尖り)の数
          const r = R / n;
          const d = r + currentParams.waveHeight * 0.3;
          const k = (R + r) / r; // 常に整数になり2πで閉じる
          x = (R + r) * Math.cos(angle) - d * Math.cos(k * angle + t);
          y = (R + r) * Math.sin(angle) - d * Math.sin(k * angle + t);
          break;
        }

        case 'Hypocycloid': { // ハイポサイクロイド(内側を転がる円の軌跡、星芒形)
          const R = currentParams.baseRadius;
          const n = currentParams.waves + 3; // カスプ(尖り)の数
          const r = R / n;
          const d = r + currentParams.waveHeight * 0.3;
          const k = (R - r) / r; // 常に整数になり2πで閉じる
          x = (R - r) * Math.cos(angle) + d * Math.cos(k * angle + t);
          y = (R - r) * Math.sin(angle) - d * Math.sin(k * angle + t);
          break;
        }

        case 'Lemniscate': // レムニスケート(∞字型)
          radius = currentParams.baseRadius * Math.sqrt(Math.abs(Math.cos(2 * angle + t))) + currentParams.waveHeight * Math.sin(currentParams.waves * angle);
          break;

        case 'Snowflake': // 雪の結晶(三角波でシャープな枝分かれ)
          radius += (2 / Math.PI) * Math.asin(Math.sin(currentParams.waves * angle + t)) * currentParams.waveHeight;
          break;

        case 'Flower': // 花(絶対値コサインで丸みのある花弁)
          radius = currentParams.baseRadius * Math.pow(Math.abs(Math.cos(currentParams.waves * angle + t)), 0.5) + currentParams.waveHeight * 0.2;
          break;

        case 'Gear': // 歯車(矩形波でカクカクした歯)
          radius += Math.sign(Math.sin(currentParams.waves * angle + t)) * currentParams.waveHeight;
          break;

        case 'Vortex': // 渦(振幅が回転しながら変化する渦巻き)
          radius += Math.sin(currentParams.waves * angle + t) * currentParams.waveHeight * Math.sin(angle + t * 0.3);
          break;

        case 'Crystal': // 結晶(三角波の絶対値で角ばった面)
          radius += (Math.abs(Math.sin(currentParams.waves * angle + t)) - 0.5) * currentParams.waveHeight;
          break;

        case 'Pulse': // 脈動(全体が呼吸するように拡縮 + 細かい鼓動)
          radius += Math.sin(t * 2) * currentParams.waveHeight * 0.7 + Math.sin(currentParams.waves * angle) * currentParams.waveHeight * 0.3;
          break;

        case 'Nebula': // 星雲(複数の周波数を重ねた有機的な形)
          radius +=
            Math.sin(currentParams.waves * angle + t) * currentParams.waveHeight * 0.5 +
            Math.sin((currentParams.waves * 2 + 1) * angle - t * 1.7) * currentParams.waveHeight * 0.3 +
            Math.sin(3 * angle + t * 0.6) * currentParams.waveHeight * 0.2;
          break;
      }

      // 極座標からXYへ変換しない(直接x,yを計算する)モード
      const isDirectXYMode = currentParams.mode === 'Lissajous' || currentParams.mode === 'Heart'
        || currentParams.mode === 'Epicycloid' || currentParams.mode === 'Hypocycloid';

      if (!isDirectXYMode) {
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
      }

      // 最初だけmoveTo、あとはlineTo
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath(); // 最後の点と最初の点を自動で繋ぐ
    ctx.stroke(); // 経路を実際に描画
    ctx.restore(); // ctx.save()で保存した状態に戻す
  };

  // ============================================

  // アニメーションループ
  useEffect(
    () => { // 関数部分
      const canvas = canvasRef.current;
      const canvasArea = canvasAreaRef.current;
      if (!canvas || !canvasArea) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationFrameId: number;

      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;

        // アスペクト比を計算（不正な解像度キーが来てもクラッシュしないようフォールバック）
        const resolution = RESOLUTIONS[paramsRef.current.resolution] ?? RESOLUTIONS['FHD (1080p)'];
        const { w: resW, h: resH } = resolution;
        const aspectRatio = resW / resH;

        // 表示領域（ヘッダー〜パネルの空き領域）の実際のサイズを直接測る
        const availableW = canvasArea.clientWidth;
        const availableH = canvasArea.clientHeight;

        // レイアウトが確定する前（モバイルでアドレスバーの表示/非表示が切り替わる瞬間など）
        // 表示領域が一時的に0になることがあるため、その場合は今回の更新をスキップする
        if (availableW <= 0 || availableH <= 0) return;

        let canvasW = availableW;
        let canvasH = availableW / aspectRatio;

        if (canvasH > availableH) {
          canvasH = availableH;
          canvasW = availableH * aspectRatio;
        }

        // キャンバスのサイズを設定
        canvas.style.width = `${canvasW}px`;
        canvas.style.height = `${canvasH}px`;
        canvas.width = canvasW * dpr;
        canvas.height = canvasH * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // refに保存（renderから読むため）
        canvasSizeRef.current = { w: canvasW, h: canvasH };

        // 背景を黒く塗る
        ctx.fillStyle = paramsRef.current.bgColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
      };
      resizeCanvasRef.current = resizeCanvas;

      resizeCanvas(); // 初回用呼び出し

      // 表示領域の実サイズが変わるたび（ウィンドウリサイズ、ヘッダー/パネルの高さ変化、
      // 開閉・録画バー表示・折り返し等）に追従させる
      const areaObserver = new ResizeObserver(resizeCanvas);
      areaObserver.observe(canvasArea);

      const render = () => {
        timeRef.current += 0.01;
        drawPath(ctx, canvasSizeRef.current.w, canvasSizeRef.current.h, paramsRef.current, timeRef.current);
        animationFrameId = requestAnimationFrame(render);
      };

      render();

      return () => {
        areaObserver.disconnect();
        cancelAnimationFrame(animationFrameId);
      };
    },
    // 配列部分
    []);

  const updateParam = (key: keyof Params, value: Params[keyof Params]) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const randomize = () => {
    const modes = ['Wave', 'Chaos', 'Star', 'Rose', 'Spirograph',
      'Polygon', 'Butterfly', 'Lissajous', 'Web', 'Heart',
      'Epicycloid', 'Hypocycloid', 'Lemniscate', 'Snowflake', 'Flower',
      'Gear', 'Vortex', 'Crystal', 'Pulse', 'Nebula'];
    setParams(prev => ({
      ...prev,  // resolution はそのまま
      strokeColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      mode: modes[Math.floor(Math.random() * modes.length)],
      points: Math.floor(Math.random() * 1990) + 10,
      waves: Math.floor(Math.random() * 49) + 1,
      waveHeight: Math.floor(Math.random() * 500),
      baseRadius: Math.floor(Math.random() * 490) + 10,
      rotationSpeed: parseFloat(((Math.random() * 4) - 2).toFixed(1)),
      waveSpeed: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
      fadeOpacity: parseFloat((Math.random() * 0.49 + 0.01).toFixed(2)),
    }));
  };

  const handleDownload = () => {
    const { w, h } = RESOLUTIONS[params.resolution];

    // オフスクリーンキャンバス（裏口の透明なキャンバス）を作成
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return;

    // ベースの背景色を塗る
    oCtx.fillStyle = params.bgColor;
    oCtx.fillRect(0, 0, w, h);

    // 残像（軌跡）を再現するために、過去60フレーム分を高速でシミュレーション描画する
    const framesToSimulate = 60;
    for (let i = framesToSimulate; i >= 0; i--) {
      const simTime = timeRef.current - (i * 0.01);
      drawPath(oCtx, w, h, params, simTime);
    }

    // 画像化してダウンロード
    const link = document.createElement('a');
    link.download = `toramatsu-art-${params.resolution.split(' ')[0]}-${Date.now()}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  };

  // 動画出力（WebM, 5秒固定 / 30fps固定 / 現在の解像度を使用）
  const handleExportVideo = () => {
    if (isRecording) return;

    // ブラウザの対応状況を確認（対応コーデックの優先順位付きリスト）
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
      window.alert('このブラウザは動画出力に対応していません。');
      return;
    }
    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      window.alert('このブラウザは動画出力に対応していません。');
      return;
    }

    const { w, h } = RESOLUTIONS[params.resolution];

    // 録画専用のオフスクリーンキャンバス（画面には表示しない）
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return;

    oCtx.fillStyle = params.bgColor;
    oCtx.fillRect(0, 0, w, h);

    setIsRecording(true);
    setRecordingProgress(0);

    // ウォームアップ：録画開始前に残像を事前に蓄積しておく
    const warmupFrames = 60;
    const baseTime = timeRef.current;
    for (let i = warmupFrames; i >= 1; i--) {
      drawPath(oCtx, w, h, params, baseTime - i * 0.01);
    }

    const fps = 30;
    const durationMs = 5000;

    const stream = offscreen.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());

      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `toramatsu-art-${params.resolution.split(' ')[0]}-${Date.now()}.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      setIsRecording(false);
      setRecordingProgress(0);
    };

    recorder.start();

    // captureStreamは「今キャンバスに描かれている内容」を撮るだけなので、
    // 録画中もこちらで描き続ける必要がある
    const startedAt = performance.now();
    let exportTime = baseTime;

    const tick = () => {
      exportTime += 0.01;
      drawPath(oCtx, w, h, params, exportTime);

      const elapsed = performance.now() - startedAt;
      setRecordingProgress(Math.min(elapsed / durationMs, 1));

      if (elapsed < durationMs) {
        requestAnimationFrame(tick);
      } else {
        recorder.stop();
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <>
      {/* キャンバス表示領域：残り幅・残り高さいっぱいに広がり、中でキャンバスを中央揃え */}
      <div ref={canvasAreaRef} className="flex-1 min-h-0 lg:min-w-0 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* UIパネル（モバイル:下部シート / デスクトップ:右サイドバー、浮いたカード風） */}
      <div className="shrink-0 px-4 py-3 sm:px-6 bg-[#111111]/75 backdrop-blur-md border-t border-x border-white/10 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.35)] max-h-[70dvh] overflow-y-auto lg:w-[clamp(400px,28vw,480px)] lg:h-full lg:max-h-none lg:overflow-hidden lg:py-3 lg:[@media(max-height:800px)]:py-2 lg:border-t-0 lg:border-x-0 lg:border-l lg:border-y lg:rounded-t-none lg:rounded-l-2xl lg:shadow-[-8px_0_30px_rgba(0,0,0,0.35)] font-sans text-sm">

        {/* アルゴリズム */}
        <div className="mb-3 lg:[@media(max-height:800px)]:mb-2">
          <SectionLabel>アルゴリズム</SectionLabel>
          <select
            value={params.mode}
            onChange={(e) => updateParam('mode', e.target.value)}
            disabled={isRecording}
            className="w-full bg-[#2d2d2d] border border-[#3d3d3d] text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00b259] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="Wave">Wave (サイン波)</option>
            <option value="Chaos">Chaos (タンジェント)</option>
            <option value="Star">Star (星型)</option>
            <option value="Rose">Rose (バラ曲線)</option>
            <option value="Spirograph">Spirograph (トロコイド風)</option>
            <option value="Polygon">Polygon (多角形)</option>
            <option value="Butterfly">Butterfly (蝶の羽)</option>
            <option value="Lissajous">Lissajous (リサジュー)</option>
            <option value="Web">Web (クモの巣)</option>
            <option value="Heart">Heart (ハート型)</option>
            <option value="Epicycloid">Epicycloid (エピサイクロイド)</option>
            <option value="Hypocycloid">Hypocycloid (星芒形)</option>
            <option value="Lemniscate">Lemniscate (無限大)</option>
            <option value="Snowflake">Snowflake (雪の結晶)</option>
            <option value="Flower">Flower (花)</option>
            <option value="Gear">Gear (歯車)</option>
            <option value="Vortex">Vortex (渦)</option>
            <option value="Crystal">Crystal (結晶)</option>
            <option value="Pulse">Pulse (脈動)</option>
            <option value="Nebula">Nebula (星雲)</option>
          </select>
        </div>

        {/* 形状 / モーション（モバイルでは開閉可能、デスクトップでは常時表示） */}
        <div className={`space-y-3 mb-3 lg:[@media(max-height:800px)]:space-y-2 lg:[@media(max-height:800px)]:mb-2 ${isPanelOpen ? 'block' : 'hidden'} lg:block`}>
          <div>
            <SectionLabel>形状</SectionLabel>
            <div className="grid grid-cols-2 gap-3 lg:[@media(max-height:800px)]:gap-2">
              <Slider label="頂点数" value={params.points} min={10} max={2000} step={1} onChange={(v) => updateParam('points', v)} disabled={isRecording} />
              <Slider label="波の数 / 頂点係数" value={params.waves} min={1} max={50} step={1} onChange={(v) => updateParam('waves', v)} disabled={isRecording} />
              <Slider label="振幅 / 歪み" value={params.waveHeight} min={0} max={500} step={1} onChange={(v) => updateParam('waveHeight', v)} disabled={isRecording} />
              <Slider label="基本半径" value={params.baseRadius} min={10} max={1500} step={1} onChange={(v) => updateParam('baseRadius', v)} disabled={isRecording} />
            </div>
          </div>

          <div>
            <SectionLabel>モーション</SectionLabel>
            <div className="grid grid-cols-2 gap-3 lg:[@media(max-height:800px)]:gap-2">
              <Slider label="回転速度" value={params.rotationSpeed} min={-2} max={2} step={0.1} onChange={(v) => updateParam('rotationSpeed', v)} disabled={isRecording} />
              <Slider label="時間変化速度" value={params.waveSpeed} min={-10} max={10} step={0.1} onChange={(v) => updateParam('waveSpeed', v)} disabled={isRecording} />
              <Slider label="残像の濃さ" value={params.fadeOpacity} min={0.01} max={0.5} step={0.01} onChange={(v) => updateParam('fadeOpacity', v)} disabled={isRecording} />
            </div>
          </div>
        </div>

        {/* 録画中の進行状況・注意文 */}
        {isRecording && (
          <div className="mb-3">
            <div className="text-yellow-400 text-xs mb-1">
              録画中… {(recordingProgress * 5).toFixed(1)} / 5.0秒 ※録画中はタブを切り替えないでください（映像が乱れる可能性があります）
            </div>
            <div className="w-full h-1.5 bg-[#2d2d2d] rounded overflow-hidden">
              <div
                className="h-full bg-[#00b259] transition-[width]"
                style={{ width: `${recordingProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* カラー / 出力 */}
        <div className="flex flex-col gap-3 items-stretch lg:[@media(max-height:800px)]:gap-2">
          {/* スマホ用開閉ボタン */}
          <button
            onClick={() => setIsPanelOpen(prev => !prev)}
            className="self-start px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-400 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] focus-visible:ring-[#00b259] lg:hidden"
          >
            {isPanelOpen ? '▼ 詳細設定を閉じる' : '▲ 詳細設定を開く'}
          </button>

          {/* カラー */}
          <div>
            <SectionLabel>カラー</SectionLabel>
            <div className="flex gap-3">
              <div>
                <label className="block mb-1 text-gray-400">背景色</label>
                <input
                  type="color"
                  value={params.bgColor}
                  onChange={(e) => updateParam('bgColor', e.target.value)}
                  disabled={isRecording}
                  className="w-10 h-8 rounded cursor-pointer bg-transparent border border-[#3d3d3d] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-400">線の色</label>
                <input
                  type="color"
                  value={params.strokeColor}
                  onChange={(e) => updateParam('strokeColor', e.target.value)}
                  disabled={isRecording}
                  className="w-10 h-8 rounded cursor-pointer bg-transparent border border-[#3d3d3d] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* 出力 */}
          <div className="flex flex-col gap-2 pt-3 border-t border-white/10 lg:[@media(max-height:800px)]:pt-2">
            <SectionLabel>出力</SectionLabel>
            <div className="grid grid-cols-3 gap-2 items-stretch">
              <div className="col-span-3">
                <label className="block mb-1 text-gray-400">解像度</label>
                <select
                  value={params.resolution}
                  onChange={(e) => updateParam('resolution', e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-[#2d2d2d] border border-[#3d3d3d] text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00b259] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.keys(RESOLUTIONS).map(res => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>

              {/* ランダムボタン（セカンダリ） */}
              <button
                onClick={randomize}
                disabled={isRecording}
                className={buttonSecondaryClass}
              >
                ランダム
              </button>

              {/* 画像を保存ボタン（プライマリ） */}
              <button
                onClick={handleDownload}
                disabled={isRecording}
                className={buttonPrimaryClass}
              >
                画像を保存
              </button>

              {/* 動画を保存ボタン（プライマリ、WebM） */}
              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className={buttonPrimaryClass}
              >
                {isRecording ? '録画中...' : '動画を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// セクション見出し用コンポーネント
const SectionLabel = ({ children }: { children: string }) => (
  <div className="text-[11px] font-semibold tracking-wider text-gray-500 mb-1.5 lg:mb-1">
    {children}
  </div>
);

// スライダー用コンポーネント
const Slider = ({ label, value, min, max, step, onChange, disabled }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, disabled?: boolean }) => (
  <div className="mb-2 lg:[@media(max-height:800px)]:mb-1">
    <div className="flex justify-between text-gray-400 mb-1 text-xs">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className="w-full accent-[#00b259] disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);
