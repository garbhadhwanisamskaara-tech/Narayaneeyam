import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import GroupDangerZone from "@/components/GroupDangerZone";
import type { Group } from "@/hooks/useGroups";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const isOwner = !!user && !!group && group.owner_id === user.id;

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
          <GroupDangerZone groupId={group.id} groupName={group.group_name} isOwner={isOwner} />
        </>
      )}
    </div>
  );
}
