import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import GroupDangerZone from "@/components/GroupDangerZone";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { Group } from "@/hooks/useGroups";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("groups")
        .select("id, group_name, owner_id, active_challenge_session_id, status, created_at")
        .eq("id", groupId)
        .maybeSingle();
      if (!cancelled) {
        setGroup((data ?? null) as Group | null);
        setName(((data ?? null) as Group | null)?.group_name ?? "");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const isOwner = !!user && !!group && group.owner_id === user.id;

  const handleRename = async () => {
    const trimmed = name.trim();
    if (!group || !trimmed || trimmed === group.group_name) return;
    if (trimmed.length > 60) {
      toast({ title: "Name too long", description: "Please use 60 characters or less.", variant: "destructive" });
      return;
    }
    setSavingName(true);
    const { error } = await (supabase as any)
      .from("groups")
      .update({ group_name: trimmed })
      .eq("id", group.id);
    setSavingName(false);
    if (error) {
      toast({ title: "Could not rename the group", description: error.message, variant: "destructive" });
      return;
    }
    setGroup({ ...group, group_name: trimmed });
    toast({ title: "Group renamed", description: `Now called ${trimmed}.` });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <SEO
        path={`/groups/${groupId}/settings`}
        title="Manage group — Sriman Narayaneeyam"
        description="Manage your group parayanam settings."
      />
      <Link
        to={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to group
      </Link>

      {loading ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />
      ) : !group ? (
        <p className="mt-6 font-sans text-sm text-muted-foreground">This group could not be found.</p>
      ) : (
        <>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Manage {group.group_name}</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Actions here affect your place in this group. Please read carefully before proceeding.
          </p>
          {isOwner && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <Pencil className="h-4 w-4 text-muted-foreground" /> Rename group
              </h2>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Everyone in the group will see the new name.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Input
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-xs"
                  aria-label="Group name"
                />
                <button
                  onClick={() => void handleRename()}
                  disabled={savingName || !name.trim() || name.trim() === group.group_name}
                  className="rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {savingName ? "Saving…" : "Save name"}
                </button>
              </div>
            </section>
          )}

          <GroupDangerZone groupId={group.id} groupName={group.group_name} isOwner={isOwner} />
        </>
      )}
    </div>
  );
}
