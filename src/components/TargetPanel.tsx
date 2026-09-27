import { formatNumber } from '../domain';
import type { TargetAssessment } from '../types';

interface TargetPanelProps {
  assessment: TargetAssessment | null;
  pricePerKwh: number;
}

export function TargetPanel({ assessment, pricePerKwh }: TargetPanelProps) {
  if (!assessment) {
    return <div className="target-card unset">
      <div className="target-head"><span className="target-badge">未设置目标</span><p>在「时间与价格」中填写月度用电目标后，这里会实时对照显示达标情况。</p></div>
    </div>;
  }

  const exceeded = assessment.status === 'exceeded';
  const ratioPercent = Math.min(assessment.usageRatio * 100, 100);
  const breakdown = assessment.devices.slice().sort((a, b) => b.excessShareKwh - a.excessShareKwh);

  return <div className={`target-card ${assessment.status}`}>
    <div className="target-head">
      <span className="target-badge">{exceeded ? '超标' : '达标'}</span>
      <p>
        目标 <b>{formatNumber(assessment.targetKwh)} kWh</b> · 当前 <b>{formatNumber(assessment.actualKwh)} kWh</b>（{Math.round(assessment.usageRatio * 100)}%）
        {exceeded
          ? <>，超出 <b>{formatNumber(assessment.deltaKwh)} kWh</b>，约多支出 <b>¥{formatNumber(assessment.deltaKwh * pricePerKwh)}</b></>
          : <>，距目标还有 <b>{formatNumber(-assessment.deltaKwh)} kWh</b> 富余</>}
      </p>
    </div>
    <div className="target-track" role="img" aria-label={`已用目标的 ${Math.round(assessment.usageRatio * 100)}%`}><i style={{ width: `${ratioPercent}%` }} /></div>
    {exceeded && <div className="target-breakdown">
      <span className="breakdown-title">超出部分按用电占比拆到各设备</span>
      {breakdown.map((device) => <div className="breakdown-row" key={device.id}>
        <span className="breakdown-name">{device.name}</span>
        <b>{formatNumber(device.excessShareKwh)} kWh</b>
        {device.adjustable
          ? <small>可调整 · 最多再省 {formatNumber(device.maxReducibleKwh)} kWh</small>
          : <small className="no-room">暂无可调整空间</small>}
      </div>)}
    </div>}
  </div>;
}
