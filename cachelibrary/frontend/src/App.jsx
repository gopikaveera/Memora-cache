import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:8080/api/cache";

function App() {
  const [policy, setPolicy] = useState("LRU");
  const [status, setStatus] = useState("Connecting...");

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("0");

  const [message, setMessage] = useState("");

  const [entries, setEntries] = useState([]);

  const [metrics, setMetrics] = useState({
    totalGets: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    expirations: 0,
    size: 0,
    capacity: 3,
    policy: "LRU",
  });

  const loadMetrics = async () => {
    try {
      const response = await fetch(`${API}/metrics`);

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();

      setMetrics(data);
      setPolicy(data.policy || "LRU");
      setStatus("Backend Connected");
    } catch (error) {
      console.error(error);
      setStatus("Backend Offline");
    }
  };

  useEffect(() => {
    loadMetrics();

    const timer = setInterval(loadMetrics, 1000);

    return () => clearInterval(timer);
  }, []);

  const addData = async () => {
    if (!key.trim() || !value.trim()) {
      setMessage("Please enter both Key and Value");
      return;
    }

    try {
      const response = await fetch(`${API}/put`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: key.trim(),
          value: value.trim(),
          ttl: Number(ttl) || 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newEntry = {
          key: key.trim(),
          value: value.trim(),
          ttl: Number(ttl) || 0,
          status: "Active",
        };

        setEntries((oldEntries) => {
          const filtered = oldEntries.filter(
            (entry) => entry.key !== newEntry.key
          );

          return [...filtered, newEntry].slice(-3);
        });

        setMessage(`✓ ${key.trim()} added to cache`);

        setKey("");
        setValue("");
        setTtl("0");

        loadMetrics();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Backend connection failed");
    }
  };

  const getData = async () => {
    if (!key.trim()) {
      setMessage("Enter a key first");
      return;
    }

    try {
      const response = await fetch(
        `${API}/get/${encodeURIComponent(key.trim())}`
      );

      const data = await response.json();

      if (data.hit) {
        setMessage(`✓ HIT: ${data.key} = ${data.value}`);

        setEntries((oldEntries) => {
          const existing = oldEntries.find(
            (entry) => entry.key === data.key
          );

          if (existing) {
            return oldEntries.map((entry) =>
              entry.key === data.key
                ? {
                    ...entry,
                    value: data.value,
                    status: "HIT",
                  }
                : entry
            );
          }

          return [
            ...oldEntries,
            {
              key: data.key,
              value: data.value,
              ttl: 0,
              status: "HIT",
            },
          ].slice(-3);
        });
      } else {
        setMessage(`✗ MISS: ${data.key} is not in cache`);

        setEntries((oldEntries) =>
          oldEntries.map((entry) =>
            entry.key === data.key
              ? {
                  ...entry,
                  status: "MISS",
                }
              : entry
          )
        );
      }

      loadMetrics();
    } catch (error) {
      console.error(error);
      setMessage("Backend connection failed");
    }
  };

  const changePolicy = async (event) => {
    const newPolicy = event.target.value;

    try {
      const response = await fetch(`${API}/policy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          policy: newPolicy,
        }),
      });

      const data = await response.json();

      setPolicy(data.policy || newPolicy);
      setMessage(`Eviction policy changed to ${newPolicy}`);

      loadMetrics();
    } catch (error) {
      console.error(error);
      setMessage("Unable to change policy");
    }
  };

  const runSample = async () => {
    try {
      const response = await fetch(`${API}/sample`, {
        method: "POST",
      });

      const data = await response.json();

      setMetrics(data);
      setPolicy(data.policy || policy);

      setEntries([
        {
          key: "A",
          value: "Apple",
          ttl: 0,
          status: "Active",
        },
        {
          key: "B",
          value: "Banana",
          ttl: 0,
          status: "Active",
        },
        {
          key: "C",
          value: "Cherry",
          ttl: 0,
          status: "Active",
        },
      ]);

      setMessage("Sample access pattern executed");
    } catch (error) {
      console.error(error);
      setMessage("Unable to run sample");
    }
  };

  const reset = async () => {
    try {
      await fetch(`${API}/reset`, {
        method: "POST",
      });

      setEntries([]);
      setMessage("Cache and metrics reset");

      loadMetrics();
    } catch (error) {
      console.error(error);
      setMessage("Unable to reset cache");
    }
  };

  return (
    <div className="app">

      <header className="header">

        <div>
          <h1>MEMORA</h1>
          <p>Custom Cache Library & Live Metrics Panel</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          {status}
        </div>

      </header>

      <main className="container">

        <section className="control-panel">

          <div>
            <label>Eviction Policy</label>

            <select
              value={policy}
              onChange={changePolicy}
            >
              <option value="LRU">
                LRU - Least Recently Used
              </option>

              <option value="LFU">
                LFU - Least Frequently Used
              </option>
            </select>
          </div>

          <div className="cache-info">
            <span>Capacity</span>
            <strong>{metrics.capacity} Entries</strong>
          </div>

          <div className="cache-info">
            <span>Current Size</span>
            <strong>{metrics.size} Entries</strong>
          </div>

        </section>

        <section className="metrics-grid">

          <div className="metric-card">
            <span>Hit Rate</span>
            <strong>
              {Number(metrics.hitRate || 0).toFixed(1)}%
            </strong>
            <small>Successful GET operations</small>
          </div>

          <div className="metric-card">
            <span>Miss Rate</span>
            <strong>
              {Number(metrics.missRate || 0).toFixed(1)}%
            </strong>
            <small>Unsuccessful GET operations</small>
          </div>

          <div className="metric-card">
            <span>Cache Hits</span>
            <strong>{metrics.hits}</strong>
            <small>Successful requests</small>
          </div>

          <div className="metric-card">
            <span>Cache Misses</span>
            <strong>{metrics.misses}</strong>
            <small>Failed requests</small>
          </div>

          <div className="metric-card">
            <span>Evictions</span>
            <strong>{metrics.evictions}</strong>
            <small>Entries removed by policy</small>
          </div>

          <div className="metric-card">
            <span>Expirations</span>
            <strong>{metrics.expirations}</strong>
            <small>TTL expired entries</small>
          </div>

        </section>

        <section className="panel add-panel">

          <h2>➕ Add Cache Data</h2>

          <div className="input-row">

            <div className="input-group">
              <label>Key</label>

              <input
                type="text"
                placeholder="Example: student1"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Value</label>

              <input
                type="text"
                placeholder="Example: Alice"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <div className="input-group ttl-input">
              <label>TTL (seconds)</label>

              <input
                type="number"
                min="0"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
              />
            </div>

          </div>

          <button
            className="add-button"
            onClick={addData}
          >
            ADD TO CACHE
          </button>

          <button
            className="get-button"
            onClick={getData}
          >
            GET DATA
          </button>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

        </section>

        <section className="dashboard-grid">

          <div className="panel">

            <h2>Cache Configuration</h2>

            <div className="config-row">
              <span>Selected Policy</span>
              <strong>{policy}</strong>
            </div>

            <div className="config-row">
              <span>Cache Type</span>
              <strong>In-Memory</strong>
            </div>

            <div className="config-row">
              <span>Thread Safety</span>
              <strong>Enabled</strong>
            </div>

            <div className="config-row">
              <span>TTL Support</span>
              <strong>Enabled</strong>
            </div>

            <div className="config-row">
              <span>Capacity</span>
              <strong>{metrics.capacity}</strong>
            </div>

          </div>

          <div className="panel">

            <h2>Sample Access Pattern</h2>

            <div className="pattern">

              <span>PUT A</span>
              <span>PUT B</span>
              <span>PUT C</span>
              <span>GET A</span>
              <span>GET B</span>
              <span>GET A</span>
              <span>GET C</span>
              <span>PUT D</span>

            </div>

            <button
              className="add-button"
              onClick={runSample}
            >
              RUN SAMPLE PATTERN
            </button>

            <button
              className="get-button"
              onClick={reset}
            >
              RESET METRICS
            </button>

          </div>

        </section>

        <section className="panel activity-panel">

          <div className="panel-header">

            <div>
              <h2>Cache Activity</h2>
              <p>Current cache entries and GET results</p>
            </div>

            <span className="policy-badge">
              {policy}
            </span>

          </div>

          <div className="cache-table">

            <div className="table-header">
              <span>Key</span>
              <span>Value</span>
              <span>Status</span>
              <span>TTL</span>
            </div>

            {entries.length === 0 ? (

              <div className="table-row">

                <span>-</span>
                <span>No data</span>
                <span>-</span>
                <span>-</span>

              </div>

            ) : (

              entries.map((entry) => (

                <div
                  className="table-row"
                  key={entry.key}
                >

                  <span>{entry.key}</span>

                  <span>{entry.value}</span>

                  <span
                    className={
                      entry.status === "MISS"
                        ? "miss"
                        : entry.status === "HIT"
                        ? "hit"
                        : "active"
                    }
                  >
                    {entry.status}
                  </span>

                  <span>
                    {entry.ttl === 0
                      ? "∞"
                      : `${entry.ttl}s`}
                  </span>

                </div>

              ))

            )}

          </div>

        </section>

      </main>

      <footer>
        MEMORA • Java 17 • Thread-Safe • LRU / LFU • TTL
      </footer>

    </div>
  );
}

export default App;
