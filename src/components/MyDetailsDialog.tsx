import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCog, Loader2 } from "lucide-react";
import { updateMyProfile } from "@/lib/auth.functions";
import { useProfile } from "@/hooks/use-profile";
import { initialsOf } from "@/lib/sequence";

/** Lets a member keep the name, initials and phone used on their quotations up to date. */
export function MyDetailsDialog() {
  const { data } = useProfile();
  const save = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", initials: "" });

  const profile = (data as any)?.profile;
  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      initials: profile.initials || initialsOf(profile.full_name),
    });
  }, [profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: form });
      toast.success("Your details were saved.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="My details">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>My details</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Initials used on quotation numbers</Label>
            <Input
              maxLength={3}
              value={form.initials}
              onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
              placeholder="MA"
            />
          </div>
          <div>
            <Label className="text-xs">Contact phone (shown on quotations)</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="35927436" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
