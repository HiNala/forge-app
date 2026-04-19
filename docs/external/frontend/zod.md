# Zod — Reference for Forge

**Version:** 3.24.x
**Last researched:** 2026-04-19

## What Forge Uses

Zod for runtime validation on the frontend: form inputs, API response parsing, generated form schema validation. Shared type inference with `z.infer<T>`.

## Core Patterns

### Form Schema Validation
```typescript
import { z } from 'zod';

// Page creation schema
export const createPageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  page_type: z.enum([
    'booking_form', 'contact_form', 'event_rsvp', 'daily_menu',
    'proposal', 'landing', 'gallery', 'custom',
  ]),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
```

### Brand Kit Validation
```typescript
const colorSchema = z.string().regex(
  /^(#[0-9a-fA-F]{6}|oklch\(.+\))$/,
  'Must be hex (#RRGGBB) or oklch format'
);

export const brandKitSchema = z.object({
  primary_color: colorSchema.optional(),
  secondary_color: colorSchema.optional(),
  display_font: z.string().optional(),
  body_font: z.string().optional(),
  voice_note: z.string().max(500).optional(),
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;
```

### Dynamic Form Field Schema (for generated pages)
```typescript
export const formFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'file', 'date', 'number']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(), // for select fields
  max_length: z.number().optional(),
  max_files: z.number().optional(),
  max_file_size_mb: z.number().optional(),
});

export const formSchema = z.object({
  fields: z.array(formFieldSchema),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchema>;
```

### API Response Parsing
```typescript
export const pageReadSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  page_type: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'live', 'archived']),
  current_html: z.string(),
  form_schema: formSchema.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Safe parse — doesn't throw
const result = pageReadSchema.safeParse(apiResponse);
if (!result.success) {
  console.error('Invalid API response:', result.error.flatten());
}
```

### Discriminated Unions
```typescript
const automationStepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('notify'), emails: z.array(z.string().email()) }),
  z.object({ type: z.literal('confirm'), template_subject: z.string(), template_body: z.string() }),
  z.object({ type: z.literal('calendar'), calendar_id: z.string(), duration_min: z.number() }),
]);
```

## Known Pitfalls

1. **`z.infer` for types**: Always derive TypeScript types from Zod schemas, never define them separately.
2. **`.safeParse()` for external data**: Use `safeParse` for API responses; use `.parse()` only when you want to throw.
3. **Datetime strings**: Use `z.string().datetime()` not `z.date()` for API responses (they come as ISO strings).

## Links
- [Zod Docs](https://zod.dev)
