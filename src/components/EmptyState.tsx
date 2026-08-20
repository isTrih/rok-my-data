import { ContactButton } from "./Frame";

/** 查询前显示活动简介；查询后无数据时显示提示。 */
export function EmptyState({ searched }: { searched: boolean }) {
  if (!searched) {
    return (
      <section className="panel space-y-4 p-6 text-sm leading-relaxed">
        <h2 className="text-base font-bold text-brand">查询说明</h2>
        <p className="font-medium text-warning">
          本页面数据及相关规则的最终解释权归《万国觉醒》执政官创作营活动组所有。
        </p>
        <div className="space-y-3 text-ink-soft">
          <p>
            <strong className="text-ink">审核结果存在延迟。</strong>
            人工审核需要一定处理周期，审核结果原则上每日更新一次，请以页面最新状态为准。
          </p>
          <p>
            <strong className="text-ink">数据同步存在延迟。</strong>
            星图及相关平台数据并非实时更新，本页面数据将根据数据源情况每日刷新，短期内可能存在数据未完全同步的情况。
          </p>
          <p>
            <strong className="text-ink">页面数据仅供阶段性参考。</strong>
            当前展示数据不代表最终结算结果，实际结算可能受到审核结果、数据回传、异常数据处理、活动规则及其他结算因素影响，最终以活动组正式结算结果为准。
          </p>
          <p>
            <strong className="text-ink">审核状态可能发生调整。</strong>
            如后续发现内容违规、数据异常、审核误判等情况，活动组有权对审核结果进行复核和调整，建议创作者每日查询最新结果。
          </p>
          <p>
            <strong className="text-ink">异常数据将以最终核验结果为准。</strong>
            如出现刷量、数据异常、重复统计、平台回传异常等情况，活动组有权在核验后对相关数据及奖励资格进行修正。
          </p>
          <p>
            <strong className="text-ink">因平台或系统原因产生的数据延迟、缺失或展示异常，不代表最终数据丢失。</strong>
            活动组将以后台最终有效数据作为结算依据。
          </p>
          <p>如对页面数据或审核结果存在疑问，请及时反馈，并以活动组最终核实结果为准。</p>
        </div>
        <div className="flex justify-center pt-2">
          <ContactButton />
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-8 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/12 text-3xl">
          🔍
        </div>
        <h2 className="text-lg font-semibold text-brand">暂未查询到数据</h2>
        <p className="text-sm text-ink-soft">请检查是否参加创作营活动</p>
        <ContactButton className="mt-3" />
      </div>
    </section>
  );
}
