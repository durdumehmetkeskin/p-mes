import { useNotification } from "@refinedev/core";
import { Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";

import { Can } from "@/components/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/providers/axios";
import { ConfirmDelete } from "./confirm-delete";

interface Member {
  id: string;
  name: string;
  email: string;
}
interface UserRow {
  id: string;
  name: string;
  email: string;
}

export const ProjectEmployees = () => {
  const { projectId } = useOutletContext<{ projectId: string }>();
  const { open } = useNotification();
  const [members, setMembers] = useState<Member[]>([]);
  const [candidates, setCandidates] = useState<UserRow[]>([]);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const [m, a] = await Promise.all([
      axiosInstance.get<Member[]>(`/projects/${projectId}/members`),
      axiosInstance
        .get<UserRow[]>(`/projects/${projectId}/assignable-users`)
        .catch(() => ({ data: [] as UserRow[] })),
    ]);
    setMembers(m.data);
    setCandidates(a.data);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/projects/${projectId}/members`, {
        userId: picked,
      });
      setPicked("");
      await refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not assign the user.";
      open?.({ type: "error", message: String(msg) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string) => {
    await axiosInstance.delete(`/projects/${projectId}/members/${userId}`);
    await refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Team ({members.length})</span>
          <Can perm="projects:manage-members">
            <div className="flex items-center gap-2">
              <Select value={picked} onValueChange={setPicked}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Assign a user…" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length ? (
                    candidates.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} · {u.email}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No users available
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!picked || busy} onClick={() => void add()}>
                <UserPlus className="mr-1 h-4 w-4" />
                Assign
              </Button>
            </div>
          </Can>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Assigned users can see this project. Admins always see every project.
        </p>
        {members.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2">{m.name}</td>
                  <td className="py-2 text-muted-foreground">{m.email}</td>
                  <td className="py-2">
                    <div className="flex justify-end">
                      <Can perm="projects:manage-members">
                        <ConfirmDelete
                          title="Remove from team?"
                          description={`"${m.name}" will no longer see this project.`}
                          onConfirm={() => void remove(m.id)}
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No users assigned yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
