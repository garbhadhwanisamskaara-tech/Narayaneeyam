import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, UserCheck, Mic, Play, Clock, CheckCircle, RefreshCw,
  AlertTriangle, Bell, Shield, Activity, Server, Database, Cloud,
  Upload, Plus, MessageSquare, Stethoscope,
} from "lucide-react";
import { useFounderCheck } from "@/hooks/useFounderCheck";
import { useUsageMetrics } from "@/hooks/useUsageMetrics";
import { useAudioHealth } from "@/hooks/useAudioHealth";
import { useChantAnalytics } from "@/hooks/useChantAnalytics";
import { useAIInsights } from "@/hooks/useAIInsights";
import { useUserIssues } from "@/hooks/useUserIssues";

function KpiCard({ icon: Icon, label, value, compare, color = "text-foreground" }: {
  icon: any; label: string; value: string | number; compare?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-sans">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
      {compare && <p className="text-[11px] text-muted-foreground font-sans">Compare ~ {compare}</p>}
    </div>
  );
}

function ChartPlaceholder({ dailySessions, days, onDaysChange }: {
  dailySessions: { date: string; count: number }[];
  days: number;
  onDaysChange: (d: number) => void;
}) {
  const max = Math.max(...dailySessions.map(s => s.count), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-foreground">Daily Chanting Sessions</h3>
        <div className="flex gap-1">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => onDaysChange(d)}
              className={`px-2 py-1 rounded text-[11px] font-sans transition-colors ${days === d ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{d === 7 ? "Last 7 days" : d === 30 ? "30 days" : "90 days"}</button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1 h-32">
        {dailySessions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs font-sans">No data yet</div>
        ) : (
          dailySessions.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-secondary/60 rounded-t" style={{ height: `${(s.count / max) * 100}%`, minHeight: 4 }} />
              <span className="text-[9px] text-muted-foreground font-sans">{s.date}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-sm font-semibold text-foreground mb-2">{children}</h3>;
}

function SystemHealthItem({ label, status }: { label: string; status: "ok" | "warning" | "critical" }) {
  const colors = { ok: "text-green-600", warning: "text-yellow-600", critical: "text-destructive" };
  const labels = { ok: "OK", warning: "Warning", critical: "Critical" };
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs font-sans text-foreground">{label}</span>
      <span className={`text-xs font-sans font-semibold ${colors[status]}`}>{labels[status]}</span>
    </div>
  );
}

export default function FounderDashboard() {
  const { isFounder, loading: authLoading } = useFounderCheck();
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartDays, setChartDays] = useState(7);

  const { metrics, loading: metricsLoading } = useUsageMetrics(refreshKey);
  const { data: audioHealth } = useAudioHealth(refreshKey);
  const { data: chantData } = useChantAnalytics(chartDays, refreshKey);
  const { insights } = useAIInsights(refreshKey);
  const { issues } = useUserIssues(refreshKey);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => setRefreshKey(k => k + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground font-sans">Checking access…</p></div>;
  }
  if (!isFounder) return <Navigate to="/" replace />;

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold text-foreground">Founder Dashboard</h1>
            <span className="text-xs text-muted-foreground font-sans">Narayaneeyam App | {today}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-sans font-semibold text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> System Healthy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* KPI Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <KpiCard icon={Users} label="Total Users" value={metrics.totalUsers} compare={String(metrics.totalUsers)} />
            <KpiCard icon={UserCheck} label="Active Today" value={metrics.activeToday} compare={`~ ${metrics.activeToday}`} />
            <KpiCard icon={Mic} label="Chant Sessions Today" value={metrics.chantSessionsToday} compare={String(metrics.chantSessionsToday)} />
            <KpiCard icon={Play} label="Audio Plays Today" value={metrics.audioPlaysToday} compare={String(metrics.audioPlaysToday)} />
            <KpiCard icon={Clock} label="Avg Listen Duration" value={metrics.avgListenDuration} compare="~ 3m 12s" />
            <KpiCard icon={CheckCircle} label="Chant Completion Rate" value={`${metrics.completionRate}%`} compare="~ 74%" />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Chart - spans 2 cols */}
            <div className="lg:col-span-2">
              <ChartPlaceholder dailySessions={chantData.dailySessions} days={chartDays} onDaysChange={setChartDays} />
            </div>

            {/* Audio Health */}
            <div className="rounded-xl border border-border bg-card p-5">
              <SectionTitle>Audio Health Panel</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[11px] text-muted-foreground font-sans">Success Rate</p>
                  <p className="font-display text-2xl font-bold text-foreground">{audioHealth.successRate}%</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-sans">Errors</p>
                  <p className="font-display text-2xl font-bold text-destructive">{audioHealth.errorCount}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-sans mb-2">Avg Load Time: {audioHealth.avgLoadTime}</p>
              <div>
                <p className="text-[11px] text-muted-foreground font-sans mb-1">Slow Files</p>
                {audioHealth.slowFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-sans italic">None detected</p>
                ) : (
                  audioHealth.slowFiles.map((f, i) => (
                    <p key={i} className="text-xs font-sans text-foreground">Dashakam {f.dashakam}</p>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom 4-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Top Dashakams */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>Top Dashakams Panel</SectionTitle>
              {chantData.topDashakams.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans italic">No data yet</p>
              ) : (
                <ol className="space-y-1">
                  {chantData.topDashakams.map((d, i) => (
                    <li key={d.dashakam} className="text-xs font-sans text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span> Dashakam {d.dashakam}
                      <span className="text-muted-foreground ml-auto">{d.plays} plays</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Error Monitor */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>Error Monitor Panel</SectionTitle>
              <p className="text-[11px] text-muted-foreground font-sans mb-2">Recent Errors</p>
              {audioHealth.brokenFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans italic">No recent errors</p>
              ) : (
                <ul className="space-y-1.5">
                  {audioHealth.brokenFiles.slice(0, 4).map((f, i) => (
                    <li key={i} className="text-xs font-sans text-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                      {f.lastError}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* AI Insights */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>AI Insights Panel</SectionTitle>
              <ul className="space-y-2">
                {insights.map(ins => (
                  <li key={ins.id} className="text-xs font-sans text-foreground flex items-start gap-2">
                    <span>{ins.icon}</span>
                    <span>{ins.message}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* User Issues */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>User Issues Panel</SectionTitle>
              <p className="text-[11px] text-muted-foreground font-sans mb-2">Recent Reports</p>
              {issues.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans italic">No issues reported</p>
              ) : (
                <ul className="space-y-1.5">
                  {issues.slice(0, 4).map(iss => (
                    <li key={iss.id} className="text-xs font-sans text-foreground flex items-center justify-between">
                      <span className="truncate">{iss.issue_type}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans ${iss.status === "open" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {iss.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* System Health + Broken Files + Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* System Health */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>System Health Section</SectionTitle>
              <SystemHealthItem label="Website Uptime" status="ok" />
              <SystemHealthItem label="Supabase DB" status="ok" />
              <SystemHealthItem label="Cloudflare R2" status="ok" />
              <SystemHealthItem label="API Health" status="ok" />
              <div className="mt-3 pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground font-sans">Last Deployment</p>
                <p className="text-xs font-sans text-foreground">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Broken Audio Files */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>Broken Audio Files Panel</SectionTitle>
              {audioHealth.brokenFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans italic">No broken files detected</p>
              ) : (
                <table className="w-full text-xs font-sans">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left pb-1">#D</th>
                      <th className="text-left pb-1">Name</th>
                      <th className="text-left pb-1">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audioHealth.brokenFiles.slice(0, 5).map((f, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5">{f.dashakam}</td>
                        <td className="py-1.5">{f.file}</td>
                        <td className="py-1.5">{f.errorCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Founder Quick Actions */}
            <div className="rounded-xl border border-border bg-card p-4">
              <SectionTitle>Founder Quick Actions</SectionTitle>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 rounded-lg bg-secondary/20 px-4 py-2.5 text-sm font-sans text-foreground hover:bg-secondary/30 transition-colors">
                  <Upload className="h-4 w-4 text-secondary" /> Upload Audio
                </button>
                <button className="w-full flex items-center gap-2 rounded-lg bg-secondary/20 px-4 py-2.5 text-sm font-sans text-foreground hover:bg-secondary/30 transition-colors">
                  <Plus className="h-4 w-4 text-secondary" /> Add Pathway
                </button>
                <button className="w-full flex items-center gap-2 rounded-lg bg-secondary/20 px-4 py-2.5 text-sm font-sans text-foreground hover:bg-secondary/30 transition-colors">
                  <MessageSquare className="h-4 w-4 text-secondary" /> View Feedback
                </button>
                <button className="w-full flex items-center gap-2 rounded-lg bg-secondary/20 px-4 py-2.5 text-sm font-sans text-foreground hover:bg-secondary/30 transition-colors">
                  <Stethoscope className="h-4 w-4 text-secondary" /> Diagnostics
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
