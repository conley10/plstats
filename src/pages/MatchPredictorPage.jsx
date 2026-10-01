import {
  Activity,
  BrainCircuit,
  Goal,
  LoaderCircle,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  getPredictorTeams,
  predictMatch,
} from "../api/matchPredictorApi";


/*
 * Convert internal model team names into cleaner
 * display names for the website.
 *
 * IMPORTANT:
 * The internal value remains "Nott'm Forest"
 * because that is the name used by the model data.
 */
function displayTeamName(team) {
  if (team === "Nott'm Forest") {
    return "Nottingham Forest";
  }

  return team;
}


function ProbabilityBar({
  label,
  value,
}) {
  const percentage = Number(value || 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-white">
          {label}
        </span>

        <span className="text-sm font-bold text-accent">
          {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, percentage),
            )}%`,
          }}
        />
      </div>
    </div>
  );
}


export default function MatchPredictorPage() {
  const [
    teams,
    setTeams,
  ] = useState([]);

  const [
    homeTeam,
    setHomeTeam,
  ] = useState("");

  const [
    awayTeam,
    setAwayTeam,
  ] = useState("");

  const [
    prediction,
    setPrediction,
  ] = useState(null);

  const [
    loadingTeams,
    setLoadingTeams,
  ] = useState(true);

  const [
    predicting,
    setPredicting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    async function loadTeams() {
      try {
        setLoadingTeams(true);
        setError("");

        const data =
          await getPredictorTeams();

        const teamList =
          data.teams || [];

        setTeams(teamList);

        if (teamList.length >= 2) {
          setHomeTeam(
            teamList.includes("Arsenal")
              ? "Arsenal"
              : teamList[0],
          );

          setAwayTeam(
            teamList.includes("Chelsea")
              ? "Chelsea"
              : teamList[1],
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          "Could not load teams from the match predictor API.",
        );
      } finally {
        setLoadingTeams(false);
      }
    }

    loadTeams();
  }, []);


  async function handlePredict(event) {
    event.preventDefault();

    if (!homeTeam || !awayTeam) {
      setError(
        "Please select both teams.",
      );

      return;
    }

    if (homeTeam === awayTeam) {
      setError(
        "Home and away teams must be different.",
      );

      return;
    }

    try {
      setPredicting(true);
      setError("");
      setPrediction(null);

      const result =
        await predictMatch(
          homeTeam,
          awayTeam,
        );

      setPrediction(result);
    } catch (err) {
      console.error(err);

      const detail =
        err?.response?.data?.detail;

      setError(
        detail ||
          "The prediction could not be generated.",
      );
    } finally {
      setPredicting(false);
    }
  }


  function swapTeams() {
    setHomeTeam(awayTeam);
    setAwayTeam(homeTeam);
    setPrediction(null);
    setError("");
  }


  return (
    <main className="page-container">
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit
            size={18}
            className="text-accent"
          />

          <span className="section-label">
            PLStats AI
          </span>
        </div>

        <h1 className="page-heading">
          Match Predictor
        </h1>

        <p className="mt-3 max-w-3xl text-muted">
          Select two Premier League teams
          to generate a match prediction
          using the PLStats V10 machine
          learning model.
        </p>
      </section>


      <section className="panel p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Sparkles size={21} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Predict a Match
            </h2>

            <p className="text-sm text-muted">
              Choose the home and away teams.
            </p>
          </div>
        </div>


        {loadingTeams ? (
          <div className="flex items-center gap-3 py-8 text-muted">
            <LoaderCircle
              className="animate-spin"
              size={20}
            />

            Loading teams...
          </div>
        ) : (
          <form
            onSubmit={handlePredict}
          >
            <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <div>
                <label
                  htmlFor="home-team"
                  className="mb-2 block text-sm font-semibold text-white"
                >
                  Home Team
                </label>

                <select
                  id="home-team"
                  value={homeTeam}
                  onChange={(event) => {
                    setHomeTeam(
                      event.target.value,
                    );

                    setPrediction(null);
                  }}
                  className="w-full rounded-lg border border-border bg-base px-4 py-3 text-white outline-none transition focus:border-accent"
                >
                  {teams.map(
                    (team) => (
                      <option
                        key={team}
                        value={team}
                      >
                        {displayTeamName(team)}
                      </option>
                    ),
                  )}
                </select>
              </div>


              <button
                type="button"
                onClick={swapTeams}
                className="secondary-button h-11 px-4"
              >
                Swap
              </button>


              <div>
                <label
                  htmlFor="away-team"
                  className="mb-2 block text-sm font-semibold text-white"
                >
                  Away Team
                </label>

                <select
                  id="away-team"
                  value={awayTeam}
                  onChange={(event) => {
                    setAwayTeam(
                      event.target.value,
                    );

                    setPrediction(null);
                  }}
                  className="w-full rounded-lg border border-border bg-base px-4 py-3 text-white outline-none transition focus:border-accent"
                >
                  {teams.map(
                    (team) => (
                      <option
                        key={team}
                        value={team}
                      >
                        {displayTeamName(team)}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>


            {error && (
              <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}


            <button
              type="submit"
              disabled={
                predicting ||
                !homeTeam ||
                !awayTeam ||
                homeTeam === awayTeam
              }
              className="primary-button mt-6 flex min-h-11 items-center justify-center gap-2 px-6 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {predicting ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />

                  Predicting...
                </>
              ) : (
                <>
                  <BrainCircuit
                    size={18}
                  />

                  Predict Match
                </>
              )}
            </button>
          </form>
        )}
      </section>


      {prediction && (
        <section className="mt-8 space-y-6">
          <div className="panel overflow-hidden">
            <div className="border-b border-border p-6 text-center">
              <span className="section-label">
                V10 Prediction
              </span>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div>
                  <p className="text-lg font-bold text-white md:text-2xl">
                    {displayTeamName(
                      prediction.home_team,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-muted">
                    Home
                  </p>
                </div>


                <div className="rounded-lg border border-border bg-base px-4 py-2 text-sm font-bold text-muted">
                  VS
                </div>


                <div>
                  <p className="text-lg font-bold text-white md:text-2xl">
                    {displayTeamName(
                      prediction.away_team,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-muted">
                    Away
                  </p>
                </div>
              </div>
            </div>


            <div className="p-6 text-center md:p-8">
              <div className="mb-3 flex justify-center">
                <Trophy
                  size={28}
                  className="text-accent"
                />
              </div>

              <p className="text-sm font-semibold uppercase tracking-wider text-muted">
                Most Likely Outcome
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-white">
                {prediction.prediction === "H"
                  ? `${displayTeamName(
                      prediction.home_team,
                    )} WIN`
                  : prediction.prediction === "A"
                    ? `${displayTeamName(
                        prediction.away_team,
                      )} WIN`
                    : "DRAW"}
              </h2>
            </div>
          </div>


          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-6">
              <div className="mb-6 flex items-center gap-3">
                <Activity
                  size={20}
                  className="text-accent"
                />

                <h2 className="text-lg font-bold text-white">
                  Result Probabilities
                </h2>
              </div>


              <div className="space-y-6">
                <ProbabilityBar
                  label={displayTeamName(
                    prediction.home_team,
                  )}
                  value={
                    prediction
                      .probability_percent
                      .home
                  }
                />

                <ProbabilityBar
                  label="Draw"
                  value={
                    prediction
                      .probability_percent
                      .draw
                  }
                />

                <ProbabilityBar
                  label={displayTeamName(
                    prediction.away_team,
                  )}
                  value={
                    prediction
                      .probability_percent
                      .away
                  }
                />
              </div>
            </div>


            <div className="panel p-6">
              <div className="mb-6 flex items-center gap-3">
                <Goal
                  size={20}
                  className="text-accent"
                />

                <h2 className="text-lg font-bold text-white">
                  Expected Goals
                </h2>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-base p-5 text-center">
                  <p className="text-sm text-muted">
                    {displayTeamName(
                      prediction.home_team,
                    )}
                  </p>

                  <p className="mt-2 text-4xl font-extrabold text-white">
                    {
                      prediction
                        .expected_goals
                        .home
                    }
                  </p>

                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    xG
                  </p>
                </div>


                <div className="rounded-xl border border-border bg-base p-5 text-center">
                  <p className="text-sm text-muted">
                    {displayTeamName(
                      prediction.away_team,
                    )}
                  </p>

                  <p className="mt-2 text-4xl font-extrabold text-white">
                    {
                      prediction
                        .expected_goals
                        .away
                    }
                  </p>

                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    xG
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div className="grid gap-6 md:grid-cols-2">
            <div className="panel p-6">
              <div className="flex items-start gap-3">
                <Shield
                  size={20}
                  className="mt-1 shrink-0 text-accent"
                />

                <div>
                  <p className="text-sm text-muted">
                    Most Likely Individual Scoreline
                  </p>

                  <p className="mt-1 text-3xl font-extrabold text-white">
                    {displayTeamName(
                      prediction.home_team,
                    )}{" "}
                    {
                      prediction
                        .most_likely_score
                        .home
                    }
                    {" - "}
                    {
                      prediction
                        .most_likely_score
                        .away
                    }{" "}
                    {displayTeamName(
                      prediction.away_team,
                    )}
                  </p>

                  <p className="mt-3 max-w-lg text-xs leading-relaxed text-muted">
                    This is the single most
                    probable exact scoreline.
                    It may differ from the most
                    likely overall outcome because
                    each outcome includes multiple
                    possible scorelines.
                  </p>
                </div>
              </div>
            </div>


            <div className="panel p-6">
              <p className="text-sm text-muted">
                Model
              </p>

              <p className="mt-1 font-bold text-white">
                PLStats V10
              </p>

              <p className="mt-3 text-sm text-muted">
                {Math.round(
                  prediction.model
                    .poisson_weight *
                    100,
                )}
                % Poisson Goal Model
                {" + "}
                {Math.round(
                  prediction.model
                    .random_forest_weight *
                    100,
                )}
                % Random Forest
              </p>
            </div>
          </div>


          <p className="text-center text-xs text-muted">
            Predictions are statistical
            estimates based on historical
            performance and are not
            guarantees of match outcomes.
          </p>
        </section>
      )}
    </main>
  );
}