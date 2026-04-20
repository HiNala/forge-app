"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsListSliding, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Stack } from "@/components/ui/stack";
import { Row } from "@/components/ui/row";
import { Container } from "@/components/ui/container";
import { Grid } from "@/components/ui/grid";
import { motion } from "framer-motion";
import { fadeUp, successSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14 scroll-mt-8">
      <h2 className="mb-6 border-b border-border pb-2 font-display text-xl font-semibold text-text">
        {title}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function PrimitivesShowcase() {
  const [tab, setTab] = React.useState("one");
  const [sw, setSw] = React.useState(true);

  return (
    <TooltipProvider>
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link style</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <p className="text-xs text-text-muted font-body">
          Press uses Framer Motion <code className="text-accent">whileTap</code> (
          <code className="text-accent">{`SPRINGS.snappy`}</code>).
        </p>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-md gap-6">
          <div>
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" placeholder="you@company.com" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" placeholder="••••••••" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="err">With error</Label>
            <Input
              id="err"
              error="This field is required."
              className="mt-2"
              defaultValue="bad"
            />
          </div>
          <div>
            <Label htmlFor="ta">Textarea</Label>
            <Textarea
              id="ta"
              className="mt-2"
              placeholder="Longer content…"
              showCount
              maxLength={240}
            />
          </div>
          <div>
            <Label htmlFor="ta2">Autoresize</Label>
            <Textarea
              id="ta2"
              className="mt-2"
              autoResize
              minRows={3}
              maxRows={12}
              placeholder="Grows with content…"
            />
          </div>
          <div>
            <Label id="forge-select-demo-label">Select (native styled)</Label>
            <Select defaultValue="a">
              <SelectTrigger
                className="mt-2"
                aria-labelledby="forge-select-demo-label"
              >
                <SelectValue placeholder="Pick one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Checkbox & switch">
        <div className="flex flex-wrap items-center gap-8">
          <label className="flex items-center gap-2 text-sm font-body">
            <Checkbox defaultChecked />
            Remember me
          </label>
          <label className="flex items-center gap-4 text-sm font-body">
            Notifications
            <Switch checked={sw} onCheckedChange={setSw} />
          </label>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-3">
          <Card hoverable>
            <CardHeader>
              <CardTitle>Hoverable</CardTitle>
              <CardDescription>Lift on hover.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted font-body">
                List tiles and choosers.
              </p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated</CardTitle>
              <CardDescription>Heavier shadow.</CardDescription>
            </CardHeader>
          </Card>
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined</CardTitle>
              <CardDescription>Transparent fill.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" size="sm">
                Footer action
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Layout: Stack, Row, Container, Grid">
        <Container max="md" className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-4">
          <Stack gap={3}>
            <Row gap={3} justify="between">
              <span className="text-sm font-body">Row (between)</span>
              <Button size="sm" variant="secondary">
                Action
              </Button>
            </Row>
            <Separator />
            <Grid cols={2} gap={4}>
              <div className="rounded-md bg-surface p-3 text-center text-sm font-body shadow-sm">
                A
              </div>
              <div className="rounded-md bg-surface p-3 text-center text-sm font-body shadow-sm">
                B
              </div>
            </Grid>
          </Stack>
        </Container>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="live">live</Badge>
          <Badge variant="draft">draft</Badge>
          <Badge variant="archived">archived</Badge>
          <Badge variant="count">12</Badge>
          <Badge variant="booking">booking</Badge>
          <Badge variant="waitlist">waitlist</Badge>
          <Badge variant="contact">contact</Badge>
          <Badge variant="landing">landing</Badge>
        </div>
      </Section>

      <Section title="Tabs (sliding indicator)">
        <Tabs value={tab} onValueChange={setTab} className="max-w-lg">
          <TabsListSliding syncValue={tab}>
            <TabsTrigger value="one" className="flex-1">
              First
            </TabsTrigger>
            <TabsTrigger value="two" className="flex-1">
              Second
            </TabsTrigger>
            <TabsTrigger value="three" className="flex-1">
              Third
            </TabsTrigger>
          </TabsListSliding>
          <TabsContent value="one" className="text-sm text-text-muted font-body">
            Tab one content.
          </TabsContent>
          <TabsContent value="two" className="text-sm text-text-muted font-body">
            Tab two content.
          </TabsContent>
          <TabsContent value="three" className="text-sm text-text-muted font-body">
            Tab three content.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog & sheet">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modal title</DialogTitle>
                <DialogDescription>
                  Backdrop blur, scale + opacity transition.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Open sheet</Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Side panel</SheetTitle>
                <SheetDescription>
                  Mobile nav and deep detail use this pattern.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => toast.success("Saved")}
          >
            Success
          </Button>
          <Button variant="secondary" onClick={() => toast("FYI: something happened")}>
            Info
          </Button>
          <Button variant="secondary" onClick={() => toast.warning("Heads up")}>
            Warning
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Could not save")}>
            Error
          </Button>
        </div>
      </Section>

      <Section title="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Short hint</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Avatar">
        <div className="flex items-center gap-4">
          <Avatar name="Alex Rivera" />
          <Avatar name="Jordan Lee" />
          <Avatar name="Sam Chen" size="lg" />
        </div>
      </Section>

      <Section title="Dropdown">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item one</DropdownMenuItem>
            <DropdownMenuItem>Item two</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-2 h-24 w-full max-w-md rounded-[var(--radius-lg)]" />
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={Sparkles}
          title="Nothing here yet"
          description="EmptyState is the standard pattern for first-run lists and search misses."
          primaryAction={{ label: "Primary action", onClick: () => undefined }}
        />
      </Section>

      <Section title="Motion helpers">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="rounded-md bg-bg-elevated p-4 text-sm font-body text-text-muted"
        >
          fadeUp on scroll
        </motion.div>
        <motion.div
          variants={successSpring}
          initial="hidden"
          animate="show"
          className="mt-4 inline-flex rounded-full bg-success/15 px-4 py-2 text-sm text-text font-body"
        >
          successSpring check
        </motion.div>
        <p className="mt-3 text-xs text-text-muted font-body">
          Spring presets: snappy / soft / bouncy — see{" "}
          <code className="text-accent">@/lib/motion</code> ({`SPRINGS`}).
        </p>
      </Section>

      <Section title="Dark subtree (Studio preview)">
        <div
          className={cn(
            "dark rounded-[10px] border border-border p-6 shadow-md",
            "max-w-xl",
          )}
        >
          <p className="font-display text-lg font-semibold text-text">
            Studio panel
          </p>
          <p className="mt-1 text-sm text-text-muted font-body">
            Add <code className="text-accent">className=&quot;dark&quot;</code> on a subtree —
            not global.
          </p>
          <Button className="mt-4" variant="primary">
            Action
          </Button>
        </div>
      </Section>
    </TooltipProvider>
  );
}
