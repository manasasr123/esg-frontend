import { useEffect, useState } from "react";
import jsPDF from "jspdf";

const API = "https://esg-backend-n9f9.onrender.com/api";
const AUTH = "Basic " + btoa("esgadmin:EsgDemo@2026"); // demo only: move to a real login before deployment

const metrics = [
  { name: "Scope 1 Emissions", category: "Environmental", value: "125.50", unit: "tCO₂e", state: "Provided" },
  { name: "Scope 2 — Location", category: "Environmental", value: "—", unit: "tCO₂e", state: "Unavailable" },
  { name: "Scope 2 — Market", category: "Environmental", value: "—", unit: "tCO₂e", state: "Unavailable" },
  { name: "Scope 3 Emissions", category: "Environmental", value: "—", unit: "tCO₂e", state: "Unavailable" },
  { name: "Energy Consumption", category: "Environmental", value: "—", unit: "MWh", state: "Unavailable" },
  { name: "Water Withdrawal", category: "Environmental", value: "—", unit: "m³", state: "Unavailable" },
  { name: "Total Waste", category: "Environmental", value: "—", unit: "tonnes", state: "Unavailable" },
  { name: "Employee Headcount", category: "Social", value: "—", unit: "people", state: "Unavailable" },
  { name: "Employee Departures", category: "Social", value: "—", unit: "people", state: "Unavailable" },
  { name: "Training Hours", category: "Social", value: "—", unit: "hours", state: "Unavailable" },
  { name: "Workplace Injuries", category: "Social", value: "—", unit: "incidents", state: "Unavailable" },
  { name: "Board Members", category: "Governance", value: "—", unit: "people", state: "Unavailable" },
  { name: "Independent Board Members", category: "Governance", value: "—", unit: "people", state: "Unavailable" },
  { name: "Anti-corruption Training", category: "Governance", value: "—", unit: "people", state: "Unavailable" },
  { name: "Ethics Cases Reported", category: "Governance", value: "—", unit: "cases", state: "Unavailable" },
];

const metricCodes = {
  "Scope 1 Emissions": "SCOPE1_EMISSIONS",
  "Scope 2 — Location": "SCOPE2_LOCATION",
  "Scope 2 — Market": "SCOPE2_MARKET",
  "Scope 3 Emissions": "SCOPE3_EMISSIONS",
  "Energy Consumption": "ENERGY_CONSUMPTION",
  "Water Withdrawal": "WATER_WITHDRAWAL",
  "Total Waste": "TOTAL_WASTE",
  "Recycled Waste": "RECYCLED_WASTE",
  "Employee Headcount": "EMPLOYEE_HEADCOUNT",
  "Employee Departures": "EMPLOYEE_DEPARTURES",
  "Training Hours": "TRAINING_HOURS",
  "Workplace Injuries": "WORKPLACE_INJURIES",
  "Board Members": "BOARD_MEMBERS",
  "Independent Board Members": "INDEPENDENT_BOARD_MEMBERS",
  "Anti-corruption Training": "ANTICORRUPTION_COMPLETED",
  "Ethics Cases Reported": "ETHICS_CASES_REPORTED",
};

const categories = ["All", "Environmental", "Social", "Governance"];

const emptyForm = {
  metricDefinitionId: "2",
  reportedValue: "",
  dataState: "PROVIDED",
  measurementStatus: "MEASURED",
  method: "",
  dataSource: "",
  assumptions: "",
  notes: "",
};

function App() {
  const [active, setActive] = useState("All");
  const [currentPage, setCurrentPage] = useState("ESG Dashboard");
  const [search, setSearch] = useState("");

  const [workflowStatus, setWorkflowStatus] = useState("DRAFT");
  const [reviewComment, setReviewComment] = useState("");

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [evidenceMessage, setEvidenceMessage] = useState("");

  const [showForm, setShowForm] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [backendMetrics, setBackendMetrics] = useState([]);
  const [workflowHistory, setWorkflowHistory] = useState([]);

  useEffect(() => {
    fetch(`${API}/evidence/list`, { headers: { Authorization: AUTH } })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load evidence");
        return response.json();
      })
      .then((data) => setEvidenceList(data))
      .catch((error) => console.error("Evidence loading failed:", error));
  }, []);

  useEffect(() => {
    fetch(`${API}/metric-entries`, { headers: { Authorization: AUTH } })
      .then(async (response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then((data) => {
        setBackendMetrics(Array.isArray(data) ? data : []);
        setBackendStatus("Connected successfully");
      })
      .catch((error) => {
        console.error("Backend connection failed:", error);
        setBackendStatus("Connection failed: " + error.message);
      });

    fetch(`${API}/workflows/1`, { headers: { Authorization: AUTH } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workflow HTTP " + response.status);
        return response.json();
      })
      .then((data) => setWorkflowStatus(data.status))
      .catch((error) => console.error("Workflow fetch failed:", error));
  }, []);

  
useEffect(() => {
  fetch(`${API}/workflows/2/history`, {
    headers: { Authorization: AUTH }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load workflow history");
      }
      return response.json();
    })
    .then((data) => setWorkflowHistory(data))
    .catch((error) => console.error(error));
}, []);


  const displayMetrics = metrics.map((metric) => {
    const match = backendMetrics.find(
      (entry) => entry.metricDefinition?.code === metricCodes[metric.name]
    );

    if (!match) return metric;

    return {
      ...metric,
      value: match.reportedValue ?? "—",
      unit: match.unit ?? metric.unit,
      state:
        match.dataState === "PROVIDED"
          ? "Provided"
          : match.dataState === "ESTIMATED"
          ? "Estimated"
          : match.dataState === "NOT_APPLICABLE"
          ? "Not applicable"
          : "Unavailable",
    };
  });

  const saveMetric = async (event) => {
    event.preventDefault();
    setSaveMessage("Saving...");

    const payload = {
      reportingPeriod: { id: 1 },
      metricDefinition: { id: Number(formData.metricDefinitionId) },
      reportedValue:
        formData.dataState === "UNAVAILABLE" ||
        formData.dataState === "NOT_APPLICABLE"
          ? null
          : Number(formData.reportedValue),
      dataState: formData.dataState,
      measurementStatus: formData.measurementStatus,
      method: formData.method,
      dataSource: formData.dataSource,
      assumptions: formData.assumptions,
      notes: formData.notes,
    };

    try {
      const response = await fetch(`${API}/metric-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTH,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      setSaveMessage("Metric saved successfully!");
      setFormData(emptyForm);

      const refresh = await fetch(`${API}/metric-entries`, {
        headers: { Authorization: AUTH },
      });

      if (refresh.ok) {
        const data = await refresh.json();
        setBackendMetrics(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      setSaveMessage("Save failed: " + error.message);
    }
  };

  const filteredMetrics = displayMetrics.filter((metric) => {
    const matchesCategory = active === "All" || metric.category === active;
    const matchesSearch = metric.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const workflowApi = async (action) => {
    const urls = {
      status: `${API}/workflows/1`,
      submit: `${API}/workflows/1/submit`,
      approve: `${API}/workflows/1/approve`,
      changes: `${API}/workflows/1/request-changes`,
    };

    const options = {
      method: action === "status" ? "GET" : "POST",
      headers: {
        Authorization: AUTH,
        "Content-Type": "application/json",
      },
    };

    if (action === "changes") {
      if (!reviewComment.trim()) {
        alert("Please enter a reviewer comment.");
        return;
      }
      options.body = JSON.stringify({ comment: reviewComment });
    }

    try {
      const response = await fetch(urls[action], options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Workflow request failed");
      }

      setWorkflowStatus(data.status);
      if (action === "changes") setReviewComment("");
      alert("Workflow status: " + data.status);
    } catch (error) {
      alert(error.message);
    }
  };

  const uploadEvidence = async () => {
    if (!evidenceFile) {
      setEvidenceMessage("Please select a file first.");
      return;
    }

    const body = new FormData();
    body.append("file", evidenceFile);

    try {
      const response = await fetch(`${API}/evidence/upload`, {
        method: "POST",
        headers: { Authorization: AUTH },
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setEvidenceMessage("Evidence uploaded successfully!");
      setEvidenceFile(null);

      const fileInput = document.getElementById("evidence-file");
      if (fileInput) fileInput.value = "";

      const listResponse = await fetch(`${API}/evidence/list`, {
        headers: { Authorization: AUTH },
      });

      if (!listResponse.ok) {
        throw new Error("Upload succeeded, but the list could not be refreshed.");
      }

      setEvidenceList(await listResponse.json());
    } catch (error) {
      setEvidenceMessage(error.message);
    }
  };

  const counts = {
    Environmental: displayMetrics.filter((m) => m.category === "Environmental").length,
    Social: displayMetrics.filter((m) => m.category === "Social").length,
    Governance: displayMetrics.filter((m) => m.category === "Governance").length,
  };

  const reportedCount = displayMetrics.filter(
    (m) => m.state === "Provided" || m.state === "Estimated"
  ).length;
  const totalCount = displayMetrics.length;
  const completeness =
    totalCount === 0 ? 0 : Math.round((reportedCount / totalCount) * 100);

  const navItems = [
    { page: "ESG Dashboard", icon: "▦" },
    { page: "Metric Reporting", icon: "▯" },
    { page: "Evidence Library", icon: "▤" },
    { page: "Review Workflow", icon: "✓" },
    { page: "Reports", icon: "▧" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
            ♻
          </div>
          <div>
            <h1 className="text-lg font-bold">ESG Central</h1>
            <p className="text-xs text-slate-500">Reporting workspace</p>
          </div>
        </div>

        <nav className="space-y-2 p-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {navItems.map((item) => (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`w-full rounded-xl px-4 py-3 text-left ${
                currentPage === item.page
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.icon} &nbsp; {item.page}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold">Reporting period</p>
            <p className="mt-1 text-sm text-slate-500">Jan – Dec 2026</p>
            <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Draft
            </span>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64">
        <div className="mx-6 mt-6 rounded-lg border bg-white p-4 text-sm md:mx-10">
          <span className="font-semibold">Backend status: </span>
          {backendStatus}
          {backendMetrics.length > 0 && (
            <span> · {backendMetrics.length} saved entries received</span>
          )}
        </div>

        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 md:px-10">
          <div>
            <p className="text-sm text-slate-500">Workspace / Overview</p>
            <h2 className="mt-1 text-xl font-bold">{currentPage}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
              A
            </div>
            <div>
              <p className="text-sm font-semibold">ESG Administrator</p>
              <p className="text-xs text-slate-500">Demo workspace</p>
            </div>
          </div>
        </header>


        <div className="space-y-8 p-6 md:p-10">
          {/* ───────────── DASHBOARD ───────────── */}
          {currentPage === "ESG Dashboard" && (
            <>
              <section className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-700 p-7 text-white md:p-9">
                <p className="text-sm font-medium text-emerald-100">2026 REPORTING CYCLE</p>
                <h3 className="mt-3 text-2xl font-bold md:text-3xl">
                  Sustainability at a glance
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                  Collect, document and review environmental, social and governance
                  performance in one reporting workspace.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      document.getElementById("metrics")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    View metrics ↓
                  </button>
                  <span className="rounded-lg border border-white/30 px-5 py-3 text-sm">
                    Demo data · Reporting period 2026
                  </span>
                </div>
              </section>

              <section>
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Reporting Completeness</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Metrics marked Provided or Estimated
                      </p>
                    </div>
                    <span className="text-3xl font-bold text-emerald-600">{completeness}%</span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {reportedCount} of {totalCount} metrics reported
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-bold">Reporting categories</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Track the metrics collected for each ESG pillar.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    {
                      name: "Environmental",
                      subtitle: "Emissions, energy, water and waste",
                      count: counts.Environmental,
                      icon: "♻",
                      color: "bg-emerald-100 text-emerald-700",
                    },
                    {
                      name: "Social",
                      subtitle: "Workforce, training and safety",
                      count: counts.Social,
                      icon: "♧",
                      color: "bg-blue-100 text-blue-700",
                    },
                    {
                      name: "Governance",
                      subtitle: "Board, ethics and anti-corruption",
                      count: counts.Governance,
                      icon: "⚖",
                      color: "bg-violet-100 text-violet-700",
                    },
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActive(item.name);
                        document.getElementById("metrics")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${item.color}`}
                      >
                        {item.icon}
                      </div>
                      <h4 className="mt-4 font-bold">{item.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-sm text-slate-500">{item.count} tracked metrics</span>
                        <span className="text-emerald-700">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section id="metrics">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">ESG metrics</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Unavailable values are not treated as zero.
                    </p>
                  </div>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search metrics..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-600 sm:w-64"
                  />
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActive(category)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active === category
                          ? "bg-emerald-700 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Metric</th>
                          <th className="px-5 py-4">Category</th>
                          <th className="px-5 py-4">Reported value</th>
                          <th className="px-5 py-4">Data state</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMetrics.map((metric) => (
                          <tr key={metric.name} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-medium">{metric.name}</td>
                            <td className="px-5 py-4 text-slate-500">{metric.category}</td>
                            <td className="px-5 py-4">
                              <span className="font-semibold">{metric.value}</span>{" "}
                              <span className="text-slate-500">{metric.unit}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  metric.state === "Provided"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {metric.state}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredMetrics.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-5 py-10 text-center text-slate-500">
                              No matching metrics found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                    Illustrative dashboard data. Values must be verified against the backend and
                    supporting evidence.
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ───────────── METRIC REPORTING ───────────── */}
          {currentPage === "Metric Reporting" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Metric Reporting</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Record an ESG value with its source and measurement method.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(!showForm)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  {showForm ? "Close form" : "+ Add metric"}
                </button>
              </div>

              {showForm && (
                <form onSubmit={saveMetric} className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Metric
                    <select
                      value={formData.metricDefinitionId}
                      onChange={(e) =>
                        setFormData({ ...formData, metricDefinitionId: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border p-3"
                    >
                      <option value="1">Scope 1 Emissions</option>
                      <option value="2">Scope 2 — Location</option>
                      <option value="3">Scope 2 — Market</option>
                      <option value="4">Scope 3 Emissions</option>
                      <option value="5">Energy Consumption</option>
                      <option value="6">Water Withdrawal</option>
                      <option value="7">Total Waste</option>
                      <option value="8">Recycled Waste</option>
                      <option value="9">Employee Headcount</option>
                      <option value="10">Employee Departures</option>
                      <option value="11">Training Hours</option>
                      <option value="12">Workplace Injuries</option>
                      <option value="13">Board Members</option>
                      <option value="14">Independent Board Members</option>
                      <option value="15">Anti-corruption Eligible</option>
                      <option value="16">Anti-corruption Completed</option>
                      <option value="17">Ethics Cases Reported</option>
                      <option value="18">Ethics Cases Open</option>
                      <option value="19">Ethics Cases Closed</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Data state
                    <select
                      value={formData.dataState}
                      onChange={(e) => setFormData({ ...formData, dataState: e.target.value })}
                      className="mt-1 block w-full rounded-lg border p-3"
                    >
                      <option value="PROVIDED">Provided</option>
                      <option value="ESTIMATED">Estimated</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                      <option value="NOT_APPLICABLE">Not applicable</option>
                    </select>
                  </label>

                  {(formData.dataState === "PROVIDED" || formData.dataState === "ESTIMATED") && (
                    <label className="text-sm font-medium">
                      Reported value
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={formData.reportedValue}
                        onChange={(e) =>
                          setFormData({ ...formData, reportedValue: e.target.value })
                        }
                        className="mt-1 block w-full rounded-lg border p-3"
                        placeholder="Enter value"
                      />
                    </label>
                  )}

                  <label className="text-sm font-medium">
                    Measurement status
                    <select
                      value={formData.measurementStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, measurementStatus: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border p-3"
                    >
                      <option value="MEASURED">Measured</option>
                      <option value="ESTIMATED">Estimated</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Method
                    <input
                      required
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="mt-1 block w-full rounded-lg border p-3"
                      placeholder="How was it calculated?"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Data source
                    <input
                      required
                      value={formData.dataSource}
                      onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                      className="mt-1 block w-full rounded-lg border p-3"
                      placeholder="Source records or documents"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Assumptions
                    <textarea
                      value={formData.assumptions}
                      onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
                      className="mt-1 block w-full rounded-lg border p-3"
                      placeholder="Assumptions or exclusions"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Notes / reason if unavailable
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="mt-1 block w-full rounded-lg border p-3"
                      placeholder="Additional details"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white"
                    >
                      Save metric
                    </button>
                    {saveMessage && (
                      <p className="mt-3 text-sm" role="status">
                        {saveMessage}
                      </p>
                    )}
                  </div>
                </form>
              )}
            </section>
          )}

          {/* ───────────── REVIEW WORKFLOW ───────────── */}
          {currentPage === "Review Workflow" && (
            <section
              id="workflow"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-800">Review Workflow</h2>
              <p className="mt-1 text-sm text-slate-500">Reporting period: 2026</p>

              <div className="mt-4">
                <span className="text-sm text-slate-600">Current status: </span>
                <span className="font-semibold text-emerald-700">
                  {workflowStatus.replaceAll("_", " ")}
                </span>
              </div>

              <textarea
                className="mt-4 w-full rounded-lg border border-slate-300 p-3"
                rows="3"
                placeholder="Reviewer comment (required when requesting changes)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  disabled={workflowStatus === "APPROVED"}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => workflowApi("submit")}
                >
                  Submit for Review
                </button>

                <button
                  disabled={workflowStatus !== "SUBMITTED"}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => workflowApi("changes")}
                >
                  Request Changes
                </button>

                <button
                  disabled={workflowStatus !== "SUBMITTED"}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => workflowApi("approve")}
                >
                  Approve
                </button>
              </div>
            </section>
          )}

          {/* ───────────── EVIDENCE LIBRARY ───────────── */}
          {currentPage === "Evidence Library" && (
            <section
              id="evidence"
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-bold text-slate-800">Evidence Library</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload supporting documents for your ESG metrics.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select evidence file (PDF, PNG, JPG, CSV)
                </label>

                <input
                  id="evidence-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  className="block w-full rounded-lg border border-slate-300 p-3 text-sm"
                  onChange={(e) => setEvidenceFile(e.target.files[0] || null)}
                />

                <button
                  type="button"
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-white"
                  onClick={uploadEvidence}
                >
                  Upload Evidence
                </button>

                <p className="mt-3 text-sm text-slate-600" role="status">
                  {evidenceMessage}
                </p>

                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold text-slate-800">Uploaded Evidence</h3>

                  {evidenceList.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No files loaded yet. Upload a file to refresh the list.
                    </p>
                  ) : (
                    evidenceList.map((file) => (
                      <div
                        key={file.originalFilename || file.storedName}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <p className="break-all text-sm font-medium">
                          {file.originalFilename || file.storedName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.sizeBytes / 1024).toFixed(1)} KB · {file.uploaded}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ───────────── REPORTS ───────────── */}
          {currentPage === "Reports" && (
            
<section className="rounded-xl border border-slate-200 bg-white p-6">
  <h3 className="text-lg font-bold text-slate-800">
    ESG Reports
  </h3>

  <p className="mt-2 text-sm text-slate-600">
    Generate and download a summary of your ESG reporting data.
  </p>

  <div className="mt-5 rounded-lg bg-slate-50 p-4">
    <h4 className="font-semibold text-slate-800">
      Demo Manufacturing Ltd
    </h4>
    <p className="mt-1 text-sm text-slate-600">
      Reporting period: January–December 2026
    </p>
    <p className="mt-1 text-sm text-amber-700">
      Demo data only. This report is not an approved final report.
    </p>
  </div>

  <button
    type="button"
    

onClick={() => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const addText = (text, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);

    const lines = doc.splitTextToSize(
      String(text ?? "Not provided"),
      pageWidth - margin * 2
    );

    const lineHeight = size * 0.5 + 2;

    if (y + lines.length * lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 3;
  };

  addText("ESG REPORT", 20, true);
  addText("Organization: Demo Manufacturing Ltd", 12);
  addText("Reporting period: January - December 2026", 12);
  addText("Workflow status: " + workflowStatus, 12);
  addText("Generated on: " + new Date().toLocaleString(), 10);
  y += 4;

  const sections = [
    ["ENVIRONMENTAL", "Environmental"],
    ["SOCIAL", "Social"],
    ["GOVERNANCE", "Governance"]
  ];

  sections.forEach(([heading, category]) => {
    addText(heading, 15, true);

    const categoryMetrics = displayMetrics.filter(
      metric => metric.category === category
    );

    categoryMetrics.forEach(metric => {
      addText(metric.name, 11, true);
      addText("Value: " + metric.value + " " + metric.unit);
      addText("Data state: " + metric.state);

      const entry = backendMetrics.find(
        item =>
          item.metricDefinition?.code === metricCodes[metric.name]
      );

      if (entry) {
        addText("Method: " + (entry.method || "Not provided"));
        addText("Source: " + (entry.dataSource || "Not provided"));
        addText("Assumptions: " + (entry.assumptions || "Not provided"));
        addText("Notes: " + (entry.notes || "None provided"));

        if (entry.unavailableReason) {
          addText("Reason unavailable: " + entry.unavailableReason);
        }
      } else {
        addText("Source details: No saved entry found for this metric.");
      }

      y += 3;
    });

    y += 4;
  });

  addText("FORMULAS AND INTERPRETATION", 14, true);
  addText(
    "Employee turnover (%) = departures / average headcount × 100. " +
    "Average headcount = (starting headcount + ending headcount) / 2."
  );
  addText(
    "Training hours per employee = total training hours / average headcount."
  );
  addText(
    "Board independence (%) = independent board members / total board members × 100."
  );
  addText(
    "Recycling (%) = recycled waste / total waste × 100."
  );
  addText(
    "Anti-corruption completion (%) = unique eligible people completed / unique eligible people × 100."
  );
  addText(
    "These percentages require valid source data. A zero denominator must be handled as undefined, not divided by zero."
  );

  addText("LIMITATIONS AND ASSUMPTIONS", 14, true);
  addText(
    "This demonstration report uses synthetic data. Missing values are " +
    "not treated as zero. Source records, evidence, reporting boundaries, " +
    "calculation methods and approval must be verified."
  );
  addText(
    "This report is a preliminary summary, not a verified final ESG report. " +
    "Carbon calculator integration and independent approval checks must be confirmed."
  );

  doc.save("ESG_Report_Demo_2026.pdf");
}}

    className="mt-5 rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800"
  >
    Download ESG Report
  </button>
</section>

          )}

          <footer className="pb-3 text-center text-xs text-slate-400">
            ESG Central · Reporting workspace · 2026
          </footer>
        </div>
      
<section className="mx-6 mb-6 rounded-xl border border-slate-200 bg-white p-6">
  <h2 className="mb-4 text-xl font-bold text-slate-800">
    Workflow History
  </h2>

  {workflowHistory.length === 0 ? (
    <p className="text-sm text-slate-500">
      No workflow history available.
    </p>
  ) : (
    <div className="space-y-4">
      {workflowHistory.map((event) => (
        <div
          key={event.id}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <strong>{event.action}</strong>
            <span className="text-sm text-slate-500">
              {event.createdAt
                ? new Date(event.createdAt).toLocaleString()
                : "Time unavailable"}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-600">
            Actor: {event.actor}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Comment: {event.comment || "No comment"}
          </p>
        </div>
      ))}
    </div>
  )}
</section>
</main>
    </div>
  );
}

export default App;