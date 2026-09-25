import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (Math.abs(number) >= 1_000_000) {
    return `€${(number / 1_000_000).toFixed(1)}m`;
  }

  if (Math.abs(number) >= 1_000) {
    return `€${Math.round(number / 1_000)}k`;
  }

  return `€${Math.round(number)}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function CustomTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  const point =
    payload[0]?.payload;

  if (!point) {
    return null;
  }

  return (
    <div className="min-w-[190px] rounded-xl border border-border bg-[#0b1220] p-4 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {point.isPrediction
          ? "PLStats prediction"
          : "Market valuation"}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {formatMoney(
          point.value,
        )}
      </p>

      {!point.isPrediction && (
        <>
          <p className="mt-2 text-sm text-muted-light">
            {formatFullDate(
              point.date,
            )}
          </p>

          {point.club && (
            <p className="mt-1 text-sm text-muted">
              {point.club}
            </p>
          )}
        </>
      )}

      {point.isPrediction && (
        <p className="mt-2 text-sm text-accent">
          Model estimate
        </p>
      )}
    </div>
  );
}

function PredictionDot(props) {
  const {
    cx,
    cy,
    payload,
  } = props;

  if (
    !payload?.isPrediction
  ) {
    return null;
  }

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill="#22d3ee"
        opacity="0.15"
      />

      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#22d3ee"
        stroke="#ffffff"
        strokeWidth={2}
      />
    </g>
  );
}

export default function MarketValueChart({
  player,
}) {
  const rawHistory =
    Array.isArray(
      player?.valuationHistory,
    )
      ? player.valuationHistory
      : [];

  if (!rawHistory.length) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-black/20 p-8 text-center">
        <p className="font-semibold text-white">
          Historical valuation data
          unavailable
        </p>

        <p className="mt-2 text-sm text-muted">
          PLStats does not currently
          have enough valuation history
          to draw this chart.
        </p>
      </div>
    );
  }

  const history = rawHistory
    .filter(
      (item) =>
        item?.date &&
        Number.isFinite(
          Number(
            item?.valueEur,
          ),
        ),
    )
    .map((item) => ({
      date: item.date,
      timestamp:
        new Date(
          item.date,
        ).getTime(),
      value:
        Number(
          item.valueEur,
        ),
      club: item.club,
      isPrediction: false,
    }))
    .sort(
      (a, b) =>
        a.timestamp -
        b.timestamp,
    );

  if (!history.length) {
    return null;
  }

  const lastActual =
    history[
      history.length - 1
    ];

  /*
   * Give the prediction its own
   * position after the final real
   * valuation.
   *
   * This is intentionally NOT
   * presented as another historical
   * Transfermarkt valuation.
   */
  const predictionTimestamp =
    lastActual.timestamp +
    120 *
      24 *
      60 *
      60 *
      1000;

  const prediction = {
    date: null,
    timestamp:
      predictionTimestamp,
    value: Number(
      player
        .predictedMarketValueEur,
    ),
    club: player.team,
    isPrediction: true,
  };

  const actualData = [
    ...history,
    {
      ...prediction,
      value: null,
    },
  ];

  const predictionData = [
    {
      ...lastActual,
      isPrediction: false,
    },
    prediction,
  ];

  const allValues = [
    ...history.map(
      (item) => item.value,
    ),
    prediction.value,
  ].filter(
    Number.isFinite,
  );

  const minimum =
    Math.min(
      ...allValues,
    );

  const maximum =
    Math.max(
      ...allValues,
    );

  const padding =
    Math.max(
      (
        maximum -
        minimum
      ) * 0.2,
      5_000_000,
    );

  const yDomain = [
    Math.max(
      0,
      minimum - padding,
    ),
    maximum + padding,
  ];

  const transfers =
    (
      player
        ?.transferHistory ||
      []
    )
      .map(
        (transfer) => ({
          ...transfer,
          timestamp:
            new Date(
              transfer.date,
            ).getTime(),
        }),
      )
      .filter(
        (transfer) =>
          Number.isFinite(
            transfer.timestamp,
          ) &&
          transfer.timestamp >=
            history[0]
              .timestamp &&
          transfer.timestamp <=
            lastActual.timestamp,
      );

  const predictedChange =
    Number(
      player
        .predictedChangeEur,
    );

  const predictedPercent =
    Number(
      player
        .predictedChangePercent,
    );

  const rising =
    predictedChange >= 0;

  return (
    <section className="panel mt-6 overflow-hidden p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Market value history
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Value & transfer
            timeline
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Historical market
            valuations are shown as
            the solid line. The final
            dashed section represents
            the PLStats model
            prediction.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-black/20 px-4 py-3 md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Predicted movement
          </p>

          <p
            className={`mt-1 text-lg font-black ${
              rising
                ? "text-emerald-400"
                : "text-rose-400"
            }`}
          >
            {rising
              ? "+"
              : ""}
            {formatMoney(
              predictedChange,
            )}

            {Number.isFinite(
              predictedPercent,
            ) && (
              <span className="ml-2 text-sm">
                (
                {rising
                  ? "+"
                  : ""}
                {predictedPercent.toFixed(
                  1,
                )}
                %)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-7 h-[390px] w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <ComposedChart
            data={history}
            margin={{
              top: 20,
              right: 30,
              bottom: 10,
              left: 10,
            }}
          >
            <CartesianGrid
              stroke="rgba(148,163,184,0.12)"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={[
                history[0]
                  .timestamp,
                predictionTimestamp,
              ]}
              tickFormatter={
                (value) =>
                  new Date(
                    value,
                  ).getFullYear()
              }
              stroke="#64748b"
              tick={{
                fill: "#94a3b8",
                fontSize: 12,
              }}
              axisLine={{
                stroke:
                  "rgba(148,163,184,0.2)",
              }}
              tickLine={false}
            />

            <YAxis
              type="number"
              domain={yDomain}
              tickFormatter={
                formatMoney
              }
              stroke="#64748b"
              tick={{
                fill: "#94a3b8",
                fontSize: 12,
              }}
              axisLine={false}
              tickLine={false}
              width={75}
            />

            <Tooltip
              content={
                <CustomTooltip />
              }
            />

            {transfers.map(
              (
                transfer,
                index,
              ) => (
                <ReferenceLine
                  key={`${transfer.date}-${index}`}
                  x={
                    transfer.timestamp
                  }
                  stroke="#a78bfa"
                  strokeDasharray="4 4"
                  strokeOpacity={0.8}
                  label={{
                    value:
                      transfer.toClub ||
                      "Transfer",
                    position:
                      "insideTopRight",
                    fill:
                      "#c4b5fd",
                    fontSize: 11,
                  }}
                />
              ),
            )}

            <Line
              data={actualData}
              dataKey="value"
              type="monotone"
              stroke="#ffffff"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "#111827",
                stroke:
                  "#ffffff",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
              }}
              connectNulls={false}
              isAnimationActive
            />

            <Line
              data={predictionData}
              dataKey="value"
              type="linear"
              stroke="#22d3ee"
              strokeWidth={3}
              strokeDasharray="7 7"
              dot={false}
              isAnimationActive
            />

            <Scatter
              data={[prediction]}
              dataKey="value"
              shape={
                <PredictionDot />
              }
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* TRANSFER EVENTS */}

      {!!transfers.length && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Transfers during chart
            period
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {transfers.map(
              (
                transfer,
                index,
              ) => (
                <div
                  key={`${transfer.date}-card-${index}`}
                  className="rounded-xl border border-border bg-black/20 p-4"
                >
                  <p className="text-sm font-bold text-white">
                    {transfer.fromClub ||
                      "Unknown"}
                    {" → "}
                    {transfer.toClub ||
                      "Unknown"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      {formatFullDate(
                        transfer.date,
                      )}
                    </span>

                    {Number.isFinite(
                      Number(
                        transfer.feeEur,
                      ),
                    ) &&
                      Number(
                        transfer.feeEur,
                      ) > 0 && (
                        <span>
                          Fee:{" "}
                          {formatMoney(
                            transfer.feeEur,
                          )}
                        </span>
                      )}

                    {Number.isFinite(
                      Number(
                        transfer.marketValueEur,
                      ),
                    ) &&
                      Number(
                        transfer.marketValueEur,
                      ) > 0 && (
                        <span>
                          Value:{" "}
                          {formatMoney(
                            transfer.marketValueEur,
                          )}
                        </span>
                      )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* LEGEND */}

      <div className="mt-6 flex flex-wrap gap-5 border-t border-border pt-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="h-[3px] w-7 rounded bg-white" />
          Historical valuation
        </div>

        <div className="flex items-center gap-2">
          <span className="w-7 border-t-2 border-dashed border-cyan-400" />
          PLStats prediction
        </div>

        {!!transfers.length && (
          <div className="flex items-center gap-2">
            <span className="h-4 border-l-2 border-dashed border-violet-400" />
            Transfer
          </div>
        )}
      </div>
    </section>
  );
}