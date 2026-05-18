import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type MemberRecord = {
  id: string;
  name: string;
  user_id: string; // treasurer / group owner
};

export function useRole() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [ownedRes, linkedRes] = await Promise.all([
        supabase
          .from("members")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user!.id),
        supabase
          .from("members")
          .select("id, name, user_id")
          .eq("auth_user_id", user!.id),
      ]);
      const ownedCount = ownedRes.count ?? 0;
      const linkedMembers = (linkedRes.data ?? []) as MemberRecord[];
      return {
        ownedCount,
        linkedMembers,
        isTreasurer: ownedCount > 0 || linkedMembers.length === 0,
        isMember: linkedMembers.length > 0,
      };
    },
  });

  return {
    loading: isLoading,
    isTreasurer: data?.isTreasurer ?? false,
    isMember: data?.isMember ?? false,
    linkedMembers: data?.linkedMembers ?? [],
  };
}
