import { CSSProperties, useEffect, useReducer } from "react";
import PQueue from "p-queue/dist";

const WORKER_POOL = 5;
const TOTAL_PARTS = 500;
const MAX_DELAY = 100; // ms
const FAIL_RATE = 20; // percent

type Part = {
  id: number;
  success: null | boolean;
};

const fakeHttpRequest = (delay: number) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = Math.ceil(Math.random() * 100) > FAIL_RATE;
      success ? resolve(null) : reject();
    }, delay);
  });

type State = {
  isUploading: boolean;
  items: Part[];
};

type Action =
  | { type: "ADD_ITEMS"; payload: Part[] }
  | { type: "START_UPLOAD" }
  | { type: "UPLOAD_SUCCESS"; payload: number }
  | { type: "UPLOAD_FAILED"; payload: number };

const reducer = (prevState: State, action: Action): State => {
  console.log("action:", action);
  const anyItemsPending = (items: Part[]) =>
    items.filter((p) => p.success === null).length > 0;

  switch (action.type) {
    case "ADD_ITEMS":
      return { ...prevState, items: action.payload };

    case "START_UPLOAD":
      const resetItems = prevState.items.map((p) => {
        if (p.success) return p;
        return { ...p, success: null };
      });
      return { ...prevState, isUploading: true, items: resetItems };

    case "UPLOAD_SUCCESS":
      const idx = prevState.items.findIndex((i) => i.id === action.payload);
      const nextItem: Part = { ...prevState.items[idx], success: true };
      const items = [
        ...prevState.items.slice(0, idx),
        nextItem,
        ...prevState.items.slice(idx + 1),
      ];
      return { ...prevState, items, isUploading: anyItemsPending(items) };

    case "UPLOAD_FAILED":
      const idx1 = prevState.items.findIndex((i) => i.id === action.payload);
      const nextItem1: Part = { ...prevState.items[idx1], success: false };
      const items1 = [
        ...prevState.items.slice(0, idx1),
        nextItem1,
        ...prevState.items.slice(idx1 + 1),
      ];
      return {
        ...prevState,
        items: items1,
        isUploading: anyItemsPending(items1),
      };

    default:
      return prevState;
  }
};

const initialState = (): State => ({ isUploading: false, items: [] });

function App() {
  const [state, dispatch] = useReducer(reducer, initialState());
  console.log("State:", state);

  function handleInitialize() {
    const fakeParts = Array(TOTAL_PARTS)
      .fill(undefined)
      .map((_, i) => i);

    dispatch({
      type: "ADD_ITEMS",
      payload: fakeParts.map((id) => ({ id, success: null })),
    });
  }

  async function run() {
    dispatch({ type: "START_UPLOAD" });

    const queue = new PQueue({ concurrency: WORKER_POOL, autoStart: false });

    const toProcess = state.items.filter((part) => part.success !== true);
    for (const { id } of toProcess) {
      const task = async () =>
        await new Promise(async (resolve) => {
          const delay = Math.ceil(Math.random() * MAX_DELAY);
          console.log(`Starting part ${id}, delayed by ${delay} ms`);

          let success: boolean;
          try {
            await fakeHttpRequest(delay);
            success = true;
          } catch (_) {
            success = false;
          }

          if (success) {
            dispatch({ type: "UPLOAD_SUCCESS", payload: id });
          } else {
            dispatch({ type: "UPLOAD_FAILED", payload: id });
          }
          console.log(`=== Finished part ${id}, success ${success}`);

          resolve(id);
        });

      queue.add(task);
    }

    console.log("Waiting for all parts to complete...");
    const promises = queue.start();
    await promises.onEmpty();
  }

  const getSuccessParts = (parts: Part[]) =>
    parts.filter((p) => p.success === true);
  const getFailedParts = (parts: Part[]) =>
    parts.filter((p) => p.success === false);

  useEffect(() => {
    if (!state.isUploading) {
      const numSuccess = getSuccessParts(state.items);
      const numFailed = getFailedParts(state.items);
      console.log(`Settled, success: ${numSuccess}, failed: ${numFailed}`);
    }
  }, [state.isUploading, state.items]);

  const numFailed = getFailedParts(state.items).length;
  const numPending = state.items.filter((p) => p.success === null).length;
  const numDone = state.items.filter((p) => p.success !== null).length;

  const partStyle = (part: Part) => {
    const base: CSSProperties = {
      fontFamily: "Helvetica, Arial, sans-serif",
      backgroundColor: "#bbbbbb",
      margin: 0,
      display: "inline-block",
      width: `${(1 / state.items.length) * 100}%`,
      height: "20px",
    };
    if (part.success === true) {
      base.backgroundColor = "green";
      // base.fontWeight = "bold";
      // base.color = "white";
    } else if (part.success === false) {
      base.backgroundColor = "red";
      // base.fontWeight = "bold";
      // base.color = "white";
    }
    return base;
  };

  return (
    <div style={{ maxWidth: "100%" }}>
      <h1>Batched processing</h1>
      <p>Press initialize to create {TOTAL_PARTS} items.</p>
      <button
        type="button"
        onClick={handleInitialize}
        disabled={state.isUploading}
      >
        Initialize
      </button>

      <p>
        Press the run button to asynchronously process the items in a queue,
        with a maximum of {WORKER_POOL} concurrently.
      </p>
      <p>
        There is a {FAIL_RATE}% chance for each item to fail. When the queue has
        completed, press Run again to retry the failed parts.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={state.isUploading || (!numPending && !numFailed)}
      >
        Run
      </button>

      <div style={{ marginTop: "20px", maxWidth: "100%" }}>
        {state.items.length > 0 && (
          <div>
            Progress ({Math.ceil((numDone / state.items.length) * 100)}
            %) ({numFailed} failed):
          </div>
        )}
        {state.items.map((part) => (
          <div key={part.id} style={partStyle(part)}>
            {/* {part.id} {part.success === null && "⌛"}
            {part.success === true && "✅"}
            {part.success === false && "❌"}{" "} */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
