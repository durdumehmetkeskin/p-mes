"use client";

import { useNotification, useUpdatePassword } from "@refinedev/core";
import { useState } from "react";

import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { open } = useNotification();
  const { mutate: updatePassword } = useUpdatePassword();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      open?.({
        type: "error",
        message: "Passwords don't match",
        description: "Please make sure both password fields are the same.",
      });
      return;
    }

    setSubmitting(true);
    updatePassword(
      { password },
      { onSettled: () => setSubmitting(false) },
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "px-6 py-8 min-h-svh",
      )}
    >
      <Card className={cn("sm:w-[456px]", "p-12")}>
        <CardHeader className={cn("px-0")}>
          <CardTitle
            className={cn(
              "text-blue-600 dark:text-blue-400",
              "text-3xl font-semibold",
            )}
          >
            Reset password
          </CardTitle>
          <CardDescription className={cn("text-muted-foreground font-medium")}>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className={cn("px-0")}>
          <form onSubmit={handleSubmit}>
            <div className={cn("flex flex-col gap-2")}>
              <Label htmlFor="password">New password</Label>
              <InputPassword
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={cn("flex flex-col gap-2 mt-6")}>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <InputPassword
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className={cn("w-full mt-6")}
            >
              {submitting ? "Saving..." : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

ResetPassword.displayName = "ResetPassword";
