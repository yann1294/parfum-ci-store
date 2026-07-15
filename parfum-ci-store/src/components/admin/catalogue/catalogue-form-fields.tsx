"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  error,
  ...props
}: ComponentProps<typeof Input> & { label: string; error?: string }) {
  const id = props.id ?? props.name;

  return (
    <Field label={label} name={String(id)} error={error}>
      <Input {...props} id={String(id)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    </Field>
  );
}

export function TextareaField({
  label,
  error,
  ...props
}: ComponentProps<typeof Textarea> & { label: string; error?: string }) {
  const id = props.id ?? props.name;

  return (
    <Field label={label} name={String(id)} error={error}>
      <Textarea
        {...props}
        id={String(id)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

export function NativeSelectField({
  label,
  name,
  defaultValue,
  children,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Field label={label} name={name}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? "none"}
        disabled={disabled}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {children}
      </select>
    </Field>
  );
}
