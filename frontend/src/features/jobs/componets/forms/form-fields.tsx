import { ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCredentials } from "@/features/credentials/hooks/use-get-credentials";

export interface BaseJobFormProps {
  description: string;
  credential_id: string;
  onDescriptionChange: (v: string) => void;
  onCredentialChange: (v: string | null) => void;
}

export function JobFormFooter({
  description,
  credential_id,
  onDescriptionChange,
  onCredentialChange,
}: BaseJobFormProps) {
  const { data, isLoading } = useGetCredentials({ page: 1, limit: 100 });
  const credentials = data?.data ?? [];
  const selectedCred = credentials.find((c) => c.id === credential_id);

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Additional Info
        </p>
        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="job-desc" className="text-sm">
            Description
            <span className="text-muted-foreground font-normal ml-1">
              (optional)
            </span>
          </Label>
          <Textarea
            id="job-desc"
            className="min-h-[70px] resize-none text-sm"
            placeholder="What does this job do?"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
        {/* Credential */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-muted-foreground" />
            <Label className="text-sm">
              Credential
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </Label>
          </div>
          <Select
            value={credential_id || "__none__"}
            onValueChange={(v) =>
              onCredentialChange(v === "__none__" ? null : v)
            }
            disabled={isLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {selectedCred ? (
                  selectedCred.title
                ) : (
                  <span className="text-muted-foreground">
                    {isLoading ? "Loading…" : "Select a credential"}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">No credential</span>
              </SelectItem>
              {credentials.map((cred) => (
                <SelectItem key={cred.id} value={cred.id}>
                  <span className="flex items-center gap-2">
                    <span>{cred.title}</span>
                    <span className="text-[11px] text-muted-foreground capitalize">
                      ({cred.credential_type})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
