import { GeometricCanvas } from './components/GeometricCanvas';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">

      {/* ヘッダー */}
      <div className="shrink-0 px-6 py-3 flex justify-between items-center pointer-events-none">

        {/* ロゴ + タイトル */}
        <div className="flex items-center gap-2">

          {/* SVGアイコン: 円+放射曲線+中心点 */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            {/* 外側の円 */}
            <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="0.5" opacity="0.5" />
            {/* 中心から放射する曲線4本 */}
            <path d="M14 2 Q18 8 14 14 Q10 20 14 26" stroke="white" strokeWidth="0.8" opacity="0.9" />
            <path d="M2 14 Q8 10 14 14 Q20 18 26 14" stroke="white" strokeWidth="0.8" opacity="0.9" />
            <path d="M4 4 Q10 10 14 14 Q18 18 24 24" stroke="white" strokeWidth="0.8" opacity="0.6" />
            <path d="M24 4 Q18 10 14 14 Q10 18 4 24" stroke="white" strokeWidth="0.8" opacity="0.6" />
            {/* 中心の点 */}
            <circle cx="14" cy="14" r="1.5" fill="white" />
          </svg>

          {/* タイトル */}
          <h1 className="text-2xl font-light tracking-widest text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}>
            ArToram
          </h1>

        </div>

        {/* 右側のクレジット */}
        <p className="text-sm text-gray-400">by ToraMutton</p>

      </div>

      {/* メイン: キャンバス + UIパネル（モバイル:縦積み / デスクトップ:横並び） */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <GeometricCanvas />
      </div>

    </div>
  );
}

export default App;
