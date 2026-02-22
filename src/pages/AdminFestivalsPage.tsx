import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, CalendarDays, Edit2, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getAllFestivals,
  saveFestival,
  updateFestival,
  deleteFestival,
  type FestivalDashakam,
} from "@/lib/festivalDashakam";

export default function AdminFestivalsPage() {
  const [festivals, setFestivals] = useState<FestivalDashakam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [dashakams, setDashakams] = useState("");
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadFestivals();
  }, []);

  const loadFestivals = async () => {
    setLoading(true);
    const data = await getAllFestivals();
    setFestivals(data);
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setDate("");
    setDashakams("");
    setMessage("");
    setIsActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (f: FestivalDashakam) => {
    setEditingId(f.id);
    setName(f.festival_name);
    setDate(f.festival_date);
    setDashakams(f.dashakam_list.join(", "));
    setMessage(f.custom_message || "");
    setIsActive(f.is_active);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dashakamList = dashakams
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 100);

    if (!name || !date || dashakamList.length === 0) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    if (editingId) {
      await updateFestival(editingId, {
        festival_name: name,
        festival_date: date,
        dashakam_list: dashakamList,
        custom_message: message,
        is_active: isActive,
      });
      toast({ title: "Festival updated" });
    } else {
      await saveFestival({
        festival_name: name,
        festival_date: date,
        dashakam_list: dashakamList,
        custom_message: message,
        is_active: isActive,
      });
      toast({ title: "Festival added" });
    }

    resetForm();
    loadFestivals();
  };

  const handleDelete = async (id: string) => {
    await deleteFestival(id);
    toast({ title: "Festival removed" });
    loadFestivals();
  };

  const handleToggle = async (f: FestivalDashakam) => {
    await updateFestival(f.id, { is_active: !f.is_active });
    loadFestivals();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-6 w-6 text-secondary" />
              <h1 className="font-display text-3xl font-bold text-foreground">Festival Dashakam Setup</h1>
            </div>
            <p className="text-muted-foreground font-sans text-sm">
              Configure special dashakam highlights for festival days
            </p>
          </div>
          <Button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-gradient-peacock text-primary-foreground font-sans"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Festival
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6 mb-8 space-y-4"
          >
            <h3 className="font-display text-lg font-semibold text-foreground">
              {editingId ? "Edit Festival" : "New Festival"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-sans text-muted-foreground mb-1 block">Festival Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Rama Navami"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-sans text-muted-foreground mb-1 block">Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-sans text-muted-foreground mb-1 block">
                Dashakam Numbers * (comma-separated, e.g., "14, 15, 16")
              </label>
              <Input
                value={dashakams}
                onChange={(e) => setDashakams(e.target.value)}
                placeholder="14, 15"
                required
              />
            </div>

            <div>
              <label className="text-sm font-sans text-muted-foreground mb-1 block">Custom Message (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="On this sacred day of Rama Navami…"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="flex items-center gap-2 text-sm font-sans"
              >
                {isActive ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                )}
                <span className={isActive ? "text-primary font-medium" : "text-muted-foreground"}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="bg-gradient-peacock text-primary-foreground font-sans">
                {editingId ? "Update" : "Save"} Festival
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="font-sans">
                Cancel
              </Button>
            </div>
          </motion.form>
        )}

        {/* Festival List */}
        {loading ? (
          <p className="text-muted-foreground font-sans text-center py-10">Loading…</p>
        ) : festivals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-sans">No festivals configured yet</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">Click "Add Festival" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {festivals.map((f, i) => {
              const isPast = f.festival_date < today;
              const isToday = f.festival_date === today;

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border bg-card p-5 ${
                    isToday
                      ? "border-secondary/50 shadow-gold"
                      : isPast
                        ? "border-border opacity-60"
                        : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-base font-semibold text-foreground truncate">
                          {f.festival_name}
                        </h4>
                        {isToday && (
                          <span className="text-xs font-sans font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                        {!f.is_active && (
                          <span className="text-xs font-sans text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-sans">
                        <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                        {new Date(f.festival_date + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm font-sans text-foreground mt-1">
                        Dashakams: <span className="font-semibold">{f.dashakam_list.join(", ")}</span>
                      </p>
                      {f.custom_message && (
                        <p className="text-xs text-muted-foreground font-sans italic mt-1">{f.custom_message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(f)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title={f.is_active ? "Disable" : "Enable"}
                      >
                        {f.is_active ? (
                          <ToggleRight className="h-5 w-5 text-primary" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(f)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
