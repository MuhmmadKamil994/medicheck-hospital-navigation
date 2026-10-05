/**
 * Live activity ticker — the "living product" strip under the navbar.
 * Values are illustrative launch targets until real analytics exist.
 */
export default function LiveTicker() {
  return (
    <div className="bg-ink text-[#C9D4E8] text-xs px-7 py-[9px] flex gap-5 justify-center items-center flex-wrap">
      <span className="mc-live-dot" aria-hidden="true" />
      <span>
        <b className="text-white tracking-[1.5px] text-[11px]">LIVE</b>
      </span>
      <span>1,284 symptom checks this week</span>
      <span>96 verified hospitals</span>
      <span>Avg. triage time 6 sec</span>
    </div>
  );
}
