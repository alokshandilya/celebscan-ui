import { useState, useEffect, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Heart,
  Clock,
  Instagram,
  Bot,
  User,
  Link as LinkIcon,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

interface Match {
  celebrity: string;
  similarity: number;
  face_index?: number;
}

interface Appearance {
  time_str: string;
  time_sec: number;
  similarity: number;
}

interface ReelMatch {
  celebrity: string;
  best_similarity: number;
  appearances: Appearance[];
  similarity?: number;
}

interface PostData {
  post_id: string;
  post_url: string;
  display_url?: string;
  status: string;
  matches: (Match | ReelMatch)[];
  caption: string;
  owner: string;
  likes?: number;
  timestamp?: string;
  hashtags?: string[];
  ai_generated?: string;
  ai_score?: number;
  displayMatches?: (Match | ReelMatch)[];
  local_path?: string;
  // properties specific to reels or common
}

const ITEMS_PER_PAGE = 24;

export default function App() {
  const [activeTab, setActiveTab] = useState<"images" | "reels">("images");
  const [data, setData] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [celebFilter, setCelebFilter] = useState<string>("");
  const [minSimilarity, setMinSimilarity] = useState<number>(0);
  const [aiFilter, setAiFilter] = useState<string>("all");
  const [minAiScore, setMinAiScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("timestamp");

  // Pagination
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const endpoint =
      activeTab === "images" ? "/data.json" : "/all_results.json";

    fetch(endpoint)
      .then((res) => res.json())
      .then((jsonData: any[]) => {
        // Normalize data structure if needed
        // For reels, matches have 'best_similarity' instead of 'similarity'
        // We can normalize this for filtering purposes
        const normalizedData = jsonData.map((item) => {
          if (activeTab === "reels") {
            return {
              ...item,
              // Normalize matches for the filter logic
              matches: item.matches.map((m: any) => ({
                ...m,
                similarity: m.best_similarity, // Map best_similarity to similarity for sorting/filtering
              })),
              timestamp: new Date().toISOString(), // Dummy timestamp as it is missing in reels json
              likes: -1, // Dummy likes
              ai_generated: "unknown",
            };
          }
          return item;
        });
        setData(normalizedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load JSON:", err);
        setLoading(false);
      });
  }, [activeTab]);

  const uniqueCelebs = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.matches) {
        item.matches.forEach((m) => set.add(m.celebrity));
      }
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (aiFilter !== "all") {
      result = result.filter((item) => {
        if (aiFilter === "yes") return item.ai_generated === "yes";
        if (aiFilter === "no") return item.ai_generated === "no";
        return item.ai_generated !== "yes" && item.ai_generated !== "no";
      });
    }

    const getTrueAiScore = (item: PostData) => {
      if (item.ai_generated === "yes") return item.ai_score || 0;
      if (item.ai_generated === "no") return 1 - (item.ai_score || 1);
      return 0.5;
    };

    if (minAiScore > 0) {
      result = result.filter(
        (item) => getTrueAiScore(item) >= minAiScore / 100,
      );
    }

    // Both filters must be satisfied by the SAME face match for the card to be included
    if (celebFilter || minSimilarity > 0) {
      result = result.filter(
        (item) =>
          item.matches &&
          item.matches.some((m) => {
            if (celebFilter && m.celebrity !== celebFilter) return false;
            if (minSimilarity > 0 && (m.similarity || 0) < minSimilarity / 100)
              return false;
            return true;
          }),
      );
    }

    // Update display matches so the card only shows faces that pass the active filters
    const mappedResult = result.map((item) => {
      if (!item.matches) return item;
      return {
        ...item,
        displayMatches: item.matches.filter((m) => {
          if (celebFilter && m.celebrity !== celebFilter) return false;
          if (minSimilarity > 0 && (m.similarity || 0) < minSimilarity / 100)
            return false;
          return true;
        }),
      };
    });

    mappedResult.sort((a, b) => {
      if (sortBy === "timestamp") {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA;
      }
      if (sortBy === "likes") {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === "similarity") {
        const maxA = a.displayMatches?.length
          ? Math.max(...a.displayMatches.map((m: any) => m.similarity))
          : 0;
        const maxB = b.displayMatches?.length
          ? Math.max(...b.displayMatches.map((m: any) => m.similarity))
          : 0;
        return maxB - maxA;
      }
      if (sortBy === "ai_score") {
        return getTrueAiScore(b) - getTrueAiScore(a);
      }
      if (sortBy === "ai_generated") {
        return (a.ai_generated || "").localeCompare(b.ai_generated || "");
      }
      return 0;
    });

    return mappedResult;
  }, [
    data,
    statusFilter,
    celebFilter,
    minSimilarity,
    aiFilter,
    minAiScore,
    sortBy,
  ]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    celebFilter,
    minSimilarity,
    aiFilter,
    minAiScore,
    sortBy,
    activeTab,
  ]);

  return (
    <div className="layout">
      {/* Sidebar Filters */}
      <aside className="sidebar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <Instagram size={28} />
          <h2 className="title" style={{ margin: 0 }}>
            CelebScan Demo
          </h2>
        </div>

        <div
          className="tab-group"
          style={{ marginBottom: "20px", display: "flex", gap: "10px" }}
        >
          <button
            className={`btn ${activeTab === "images" ? "btn-primary" : "btn-secondary"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setActiveTab("images")}
          >
            <ImageIcon size={16} /> Images
          </button>
          <button
            className={`btn ${activeTab === "reels" ? "btn-primary" : "btn-secondary"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setActiveTab("reels")}
          >
            <Video size={16} /> Reels
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Search size={14} /> Celebrity
            </span>
          </label>
          <select
            className="select"
            value={celebFilter}
            onChange={(e) => setCelebFilter(e.target.value)}
          >
            <option value="">All Celebrities</option>
            {uniqueCelebs.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>Minimum Similarity</span>
            <span>{minSimilarity}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={minSimilarity}
            onChange={(e) => setMinSimilarity(Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Bot size={14} /> AI Status
            </span>
          </label>
          <select
            className="select"
            value={aiFilter}
            onChange={(e) => setAiFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="yes">AI Generated</option>
            <option value="no">Real Image</option>
            <option value="unknown">Unknown / Edited</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>Minimum AI Score</span>
            <span>{minAiScore}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={minAiScore}
            onChange={(e) => setMinAiScore(Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <SlidersHorizontal size={14} /> Status
            </span>
          </label>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="ok">Success (ok)</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="form-group" style={{ marginTop: "auto" }}>
          <label className="form-label">Sort By</label>
          <select
            className="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="timestamp">Newest First</option>
            <option value="similarity">Highest Match</option>
            <option value="ai_score">Highest AI Score</option>
            <option value="likes">Most Likes</option>
            <option value="ai_generated">AI Generated Status</option>
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 className="title">Results Overview</h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginTop: "4px",
                fontWeight: 600,
              }}
            >
              Showing {filteredData.length} of {data.length} records.
            </p>
          </div>
        </header>

        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="loader" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <Search size={48} opacity={0.2} />
            <h2>No results found</h2>
            <p>
              Try adjusting your search filters to find what you're looking for.
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCelebFilter("");
                setMinSimilarity(0);
                setAiFilter("all");
                setMinAiScore(0);
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid">
              {paginatedData.map((item, idx) => (
                <div key={`${item.post_id}-${idx}-${page}`} className="card">
                  <div
                    className="card-image-wrap"
                    style={{
                      padding: "0",
                      borderBottom: "2px solid var(--border-color)",
                      height: "360px",
                      position: "relative",
                    }}
                  >
                    <span className="status-badge" style={{ zIndex: 10 }}>
                      {item.status}
                    </span>
                    {activeTab === "images" ? (
                      <LazyLoadImage
                        src={item.local_path}
                        alt="Post visual"
                        effect="blur"
                        threshold={800}
                        visibleByDefault={idx < 12}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        wrapperProps={{
                          style: {
                            display: "block",
                            width: "100%",
                            height: "100%",
                          },
                        }}
                        onError={(e: any) => {
                          const target = e.currentTarget;
                          // Failed, hide image and show the URL string
                          target.style.display = "none";
                          const fallback =
                            target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "block";
                        }}
                      />
                    ) : item.local_path ? (
                      <video
                        src={item.local_path}
                        controls
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000",
                          color: "#fff",
                        }}
                      >
                        <Video size={48} />
                      </div>
                    )}
                    <div
                      className="url-block"
                      style={{
                        display: activeTab === "reels" ? "flex" : "none", // For reels, we might want to show this on hover or always if no thumb
                        flexDirection: "column",
                        padding: "20px",
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "100%",
                        wordBreak: "break-all",
                        textAlign: "center",
                      }}
                    >
                      {activeTab === "images" && (
                        <>
                          <strong>POST URL</strong>
                          <br />
                        </>
                      )}
                      {activeTab === "reels" && (
                        <a
                          href={item.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ marginBottom: "10px" }}
                        >
                          Watch Reel
                        </a>
                      )}
                      <a
                        href={item.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link"
                        style={{
                          display: activeTab === "images" ? "block" : "none",
                        }}
                      >
                        {item.post_url}
                      </a>
                    </div>
                  </div>

                  <div className="card-content">
                    {activeTab === "images" && (
                      <div className="badge-row">
                        {item.ai_generated === "yes" && (
                          <div className="badge">
                            <Bot size={12} /> AI Gen (
                            {((item.ai_score || 0) * 100).toFixed(0)}%)
                          </div>
                        )}
                        {item.ai_generated === "no" && (
                          <div className="badge">
                            <User size={12} /> Real (
                            {((item.ai_score || 0) * 100).toFixed(0)}%)
                          </div>
                        )}
                        {item.ai_generated !== "yes" &&
                          item.ai_generated !== "no" &&
                          item.ai_generated &&
                          item.ai_generated !== "unknown" && (
                            <div className="badge">{item.ai_generated}</div>
                          )}
                      </div>
                    )}

                    <p className="caption">
                      {item.caption || "No caption provided."}
                    </p>

                    {item.displayMatches && item.displayMatches.length > 0 && (
                      <div className="matches-list">
                        {item.displayMatches.map((m: any, i) => (
                          <div key={i} className="match-item-wrapper">
                            <div className="match-item">
                              <span className="match-celeb">
                                {m.celebrity.replace("_", " ")}
                              </span>
                              <span className="match-sim">
                                {(m.similarity * 100).toFixed(1)}% match
                              </span>
                            </div>
                            {/* Show timestamps for reels if available */}
                            {m.appearances && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  paddingLeft: "4px",
                                  marginBottom: "4px",
                                }}
                              >
                                @{" "}
                                {m.appearances
                                  .map((a: any) => a.time_str)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    {activeTab === "images" && (
                      <div className="icon-text">
                        <Heart size={14} />
                        {(item.likes || -1) > -1 ? item.likes : "Hidden"}
                      </div>
                    )}
                    {item.timestamp && (
                      <div className="icon-text">
                        <Clock size={14} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    )}
                    <a
                      href={item.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link display-flex"
                      title="View on Instagram"
                    >
                      <LinkIcon size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="page-info">
                  Page <b>{page}</b> of {totalPages}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
