import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Users } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import SEO from "@/components/SEO";
import DashakamQueueList from "@/components/DashakamQueueList";

export default function GroupsPage() {
  const { groups, loading, error, createGroup } = useGroups();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await createGroup(name);
      setName("");
    } catch (err: any) {
      setFormError(err?.message ?? "Could not create the group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <SEO path="/groups" title="Parayanam Groups — Sriman Narayaneeyam" description="Create a group and chant Narayaneeyam together." />
      <h1 className="font-display text-2xl font-bold text-foreground">Parayanam Groups</h1>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Chant together — create a group and invite loved ones.
      </p>

      <div className="mt-6 empty:hidden [&:has(>*:empty)]:hidden">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock empty:hidden">
          <DashakamQueueList showGroupsLink={false} />
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
        <label htmlFor="group_name" className="font-sans text-sm font-semibold text-foreground">
          Group name
        </label>
        <input
          id="group_name"
          name="group_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Family Parayanam"
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
        {formError && <p className="mt-2 font-sans text-sm text-destructive">{formError}</p>}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Group
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Your groups</h2>
        {loading ? (
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
        ) : error ? (
          <p className="mt-3 font-sans text-sm text-destructive">{error}</p>
        ) : groups.length === 0 ? (
          <p className="mt-3 font-sans text-sm text-muted-foreground">No groups yet — create your first one above.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  to={`/groups/${g.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"
                >
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-sans text-sm font-semibold text-foreground">{g.group_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
