"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiGooglesheets } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { verify_sheet_id, disconnect_sheet } from "../action";
import { useSheet } from "../hooks/use-sheet";

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const SettingsClient = () => {
  const { connected, title, isLoading, setConnected, setDisconnected } =
    useSheet();

  const [testing, setTesting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [inputId, setInputId] = useState("");

  const handleTestConnection = async () => {
    if (!inputId.trim()) {
      toast.warning("Paste your Sheet ID first");
      return;
    }
    setTesting(true);
    try {
      const result = await verify_sheet_id(inputId.trim());
      setConnected(result.title); // optimistic update with live title
      setConnectOpen(false);
      setInputId("");
      toast.success(`Connected to "${result.title}"`, {
        description: "Your sheet is ready to use as a database.",
      });
    } catch (err: any) {
      toast.error("Could not connect", {
        description:
          err.message ??
          "Make sure the sheet is set to public and the ID is correct.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect_sheet();
      setDisconnected();
      toast.info("Google Sheets disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1 pb-6 border-b">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Connect external services and manage programmatic access to your
          account.
        </p>
      </div>

      <section className="space-y-1">
        <div className="flex items-center gap-4 py-4 px-1">
          <div className="w-8 h-8 shrink-0 rounded-md bg-emerald-500/10 flex items-center justify-center">
            <SiGooglesheets className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none mb-1">
              Google Sheets
            </p>
            {isLoading ? (
              <Skeleton className="h-3 w-40 mt-1" />
            ) : (
              <p className="text-xs text-muted-foreground">
                {connected && title
                  ? `Connected to "${title}"`
                  : "Use a Google Sheet as your live database for all records"}
              </p>
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-7 w-20 rounded-md" />
          ) : connected ? (
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-xs gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                className="text-xs h-7"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 shrink-0 gap-1"
                onClick={() => setConnectOpen(true)}
              >
                Connect
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </Button>

              <Dialog
                open={connectOpen}
                onOpenChange={(o) => {
                  setConnectOpen(o);
                  if (!o) setInputId("");
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Connect Google Sheets</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-1">
                    {/* Instructions */}
                    <div className="rounded-md border bg-muted/50 px-4 py-3 space-y-1.5">
                      <p className="text-xs font-medium">Before connecting</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Open your Google Sheet</li>
                        <li>
                          Click{" "}
                          <span className="font-medium text-foreground">
                            Share
                          </span>{" "}
                          →{" "}
                          <span className="font-medium text-foreground">
                            Change to anyone with the link
                          </span>
                        </li>
                        <li>
                          Set the role to{" "}
                          <span className="font-medium text-foreground">
                            Viewer
                          </span>
                        </li>
                        <li>
                          Copy the Sheet ID from the URL and paste it below
                        </li>
                      </ol>
                    </div>

                    {/* Sheet ID input */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="sheetIdInput"
                        className="text-xs font-medium"
                      >
                        Sheet ID
                      </Label>
                      <Input
                        id="sheetIdInput"
                        type="password"
                        value={inputId}
                        onChange={(e) => setInputId(e.target.value)}
                        placeholder="Paste your Sheet ID"
                        className="font-mono text-xs"
                        disabled={testing}
                        autoComplete="off"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Found in the URL between{" "}
                        <span className="font-mono">/d/</span> and{" "}
                        <span className="font-mono">/edit</span>
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConnectOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="gap-2"
                    >
                      <RefreshCw
                        className={cn("w-3.5 h-3.5", testing && "animate-spin")}
                      />
                      {testing ? "Testing…" : "Test & connect"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        <Separator />
      </section>
    </div>
  );
};

export default SettingsClient;
