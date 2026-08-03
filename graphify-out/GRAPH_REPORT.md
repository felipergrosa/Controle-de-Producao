# Graph Report - .  (2026-07-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1167 nodes · 2728 edges · 123 communities (44 shown, 79 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e98d4e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LancamentoRepuxados.tsx
- ComponentShowcase.tsx
- db.ts
- cn
- getDb
- schema.ts
- sidebar.tsx
- DashboardLayout.tsx
- react
- compilerOptions
- auth.ts
- llm.ts
- alert-dialog.tsx
- sdk.ts
- devDependencies
- field.tsx
- input-group.tsx
- dependencies
- db-jornada.ts
- menubar.tsx
- components.json
- zxing.d.ts
- context.ts
- SDKServer
- index.ts
- item.tsx
- oauth.ts
- scripts
- migrations.ts
- storage.ts
- notification.ts
- voiceTranscription.ts
- confetti.tsx
- pnpm
- AIChatBox.tsx
- ErrorBoundary.tsx
- toggle-group.tsx
- errors.ts
- xlsx
- package.json
- start.sh
- generate-hash.mjs
- safe-deploy-migration-003.sh
- @aws-sdk/client-s3
- @aws-sdk/s3-request-presigner
- axios
- bcryptjs
- @builder.io/vite-plugin-jsx-loc
- canvas-confetti
- class-variance-authority
- cmdk
- cookie-parser
- cross-env
- cookie
- dotenv
- embla-carousel-react
- framer-motion
- html5-qrcode
- input-otp
- jose
- lucide-react
- mysql2
- nanoid
- next-themes
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- react-data-grid
- react-day-picker
- react-dom
- react-hook-form
- react-resizable-panels
- recharts
- sonner
- streamdown
- superjson
- sweetalert2
- tailwindcss-animate
- @tanstack/react-query
- @trpc/client
- @trpc/react-query
- vaul
- wouter
- zod
- @zxing/browser
- @zxing/library
- pnpm
- postcss
- prettier
- @tailwindcss/typography
- @tailwindcss/vite
- tw-animate-css
- @types/bcryptjs
- @types/node
- @types/react
- @types/react-dom
- vite
- @vitejs/plugin-react
- verify-migration-003.sh
- cookie.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 284 edges
2. `getDb()` - 106 edges
3. `Button()` - 28 edges
4. `react` - 20 edges
5. `Input()` - 18 edges
6. `toDateOnlyString()` - 17 edges
7. `Card()` - 16 edges
8. `CardContent()` - 16 edges
9. `DialogContent()` - 15 edges
10. `Label()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `getDb()`  [EXTRACTED]
  scripts/check-database-state.ts → server/db.ts
- `main()` --calls--> `getDb()`  [EXTRACTED]
  scripts/export-repuxados-backup.ts → server/db.ts
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/calendar.tsx → package.json
- `useDialogComposition()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/dialog.tsx → package.json
- `Dialog()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/dialog.tsx → package.json

## Import Cycles
- None detected.

## Communities (123 total, 79 thin omitted)

### Community 0 - "LancamentoRepuxados.tsx"
Cohesion: 0.06
Nodes (95): CameraDetectedPayload, CameraScannerDialog(), CameraScannerDialogProps, HelpTooltip(), ManusDialogProps, Accordion(), AccordionContent(), AccordionItem() (+87 more)

### Community 1 - "ComponentShowcase.tsx"
Cohesion: 0.05
Nodes (45): AspectRatio(), Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator() (+37 more)

### Community 2 - "db.ts"
Cohesion: 0.06
Nodes (60): productHistory, addProductHistory(), addUtcDays(), attachPoolErrorHandler(), buildBrazilHolidaySet(), buildPoolOptions(), calculateEasterSundayUtc(), canFinalizeDay() (+52 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (48): CardAction(), Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList() (+40 more)

### Community 4 - "getDb"
Cohesion: 0.10
Nodes (51): deleteUser(), getAllUsers(), getAuditLogs(), getUserById(), logout(), toggleUserActive(), updateUser(), validateSession() (+43 more)

### Community 5 - "schema.ts"
Cohesion: 0.06
Nodes (43): AuditLog, CausaQuebra, causasQuebra, InsertCausaQuebra, InsertMetaRepuxo, InsertMotivoParada, InsertParadaMaquina, InsertPoliticaJornada (+35 more)

### Community 6 - "sidebar.tsx"
Cohesion: 0.06
Nodes (36): DashboardLayoutSkeleton(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle() (+28 more)

### Community 7 - "DashboardLayout.tsx"
Cohesion: 0.07
Nodes (31): DashboardLayout(), DashboardLayoutContent(), DashboardLayoutContentProps, MenuItem, menuItems, HelpTooltipProps, Avatar(), AvatarFallback() (+23 more)

### Community 8 - "react"
Cohesion: 0.07
Nodes (34): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+26 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (31): build, client/src/**/*, dist, dom, dom.iterable, esnext, node, node_modules (+23 more)

### Community 10 - "auth.ts"
Cohesion: 0.11
Nodes (26): auditLogs, InsertAuditLog, InsertUser, Session, sessions, main(), AuditLogsCursor, AuditLogsFilters (+18 more)

### Community 11 - "llm.ts"
Cohesion: 0.10
Nodes (25): assertApiKey(), ensureArray(), FileContent, ImageContent, invokeLLM(), InvokeParams, InvokeResult, JsonSchema (+17 more)

### Community 12 - "alert-dialog.tsx"
Cohesion: 0.10
Nodes (17): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogTitle() (+9 more)

### Community 13 - "sdk.ts"
Cohesion: 0.15
Nodes (12): OAuthService, SessionPayload, AuthorizeRequest, AuthorizeResponse, CanAccessRequest, CanAccessResponse, ExchangeTokenRequest, ExchangeTokenResponse (+4 more)

### Community 14 - "devDependencies"
Cohesion: 0.11
Nodes (19): add, autoprefixer, drizzle-kit, devDependencies, add, autoprefixer, drizzle-kit, tailwindcss (+11 more)

### Community 15 - "field.tsx"
Cohesion: 0.13
Nodes (16): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Field(), FieldContent(), FieldDescription(), FieldError() (+8 more)

### Community 16 - "input-group.tsx"
Cohesion: 0.15
Nodes (15): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+7 more)

### Community 17 - "dependencies"
Cohesion: 0.11
Nodes (19): clsx, date-fns, drizzle-orm, dependencies, clsx, date-fns, drizzle-orm, @radix-ui/react-accordion (+11 more)

### Community 18 - "db-jornada.ts"
Cohesion: 0.22
Nodes (15): politicaJornada, calcularMetricasOperadores(), calcularMinutosDia(), calcularMinutosDisponiveisPeriodo(), calcularResumoJornada(), createPoliticaJornada(), deactivatePoliticaJornada(), getAllPoliticasJornada() (+7 more)

### Community 19 - "menubar.tsx"
Cohesion: 0.12
Nodes (12): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarMenu(), MenubarRadioItem(), MenubarSeparator() (+4 more)

### Community 20 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 21 - "zxing.d.ts"
Cohesion: 0.14
Nodes (7): BrowserMultiFormatReader, Exception, IScannerControls, NotFoundException, Result, @zxing/browser, @zxing/library

### Community 22 - "context.ts"
Cohesion: 0.19
Nodes (8): TrpcContext, DataApiCallOptions, ENV, GenerateImageOptions, GenerateImageResponse, requireAdmin, requireUser, t

### Community 23 - "SDKServer"
Cohesion: 0.23
Nodes (4): User, isNonEmptyString(), SDKServer, ForbiddenError()

### Community 24 - "index.ts"
Cohesion: 0.26
Nodes (11): express, express, createContext(), findAvailablePort(), isPortAvailable(), startServer(), registerOAuthRoutes(), serveStatic() (+3 more)

### Community 25 - "item.tsx"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 26 - "oauth.ts"
Cohesion: 0.18
Nodes (7): queryClient, trpcClient, getSessionCookieOptions(), isSecureRequest(), LOCAL_HOSTS, getQueryParam(), sdk

### Community 27 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:migrate, db:migrate:status, db:push, db:up, dev (+5 more)

### Community 28 - "migrations.ts"
Cohesion: 0.36
Nodes (10): main(), ensureBaseSchema(), ensureMigrationsTable(), executeMigration(), getExecutedMigrations(), listMigrations(), Migration, readMigrationFiles() (+2 more)

### Community 29 - "storage.ts"
Cohesion: 0.42
Nodes (10): buildAuthHeaders(), buildDownloadUrl(), buildUploadUrl(), ensureTrailingSlash(), getStorageConfig(), normalizeKey(), StorageConfig, storageGet() (+2 more)

### Community 30 - "notification.ts"
Cohesion: 0.36
Nodes (7): buildEndpointUrl(), isNonEmptyString(), NotificationPayload, notifyOwner(), trimValue(), validatePayload(), systemRouter

### Community 31 - "voiceTranscription.ts"
Cohesion: 0.28
Nodes (8): getFileExtension(), getLanguageName(), transcribeAudio(), TranscribeOptions, TranscriptionError, TranscriptionResponse, WhisperResponse, WhisperSegment

### Community 32 - "confetti.tsx"
Cohesion: 0.25
Nodes (7): Api, Confetti, ConfettiButton(), ConfettiButtonProps, ConfettiContext, ConfettiProps, ConfettiRef

### Community 33 - "pnpm"
Cohesion: 0.25
Nodes (8): esbuild, esbuild, tailwindcss>nanoid, wouter@3.7.1, pnpm, ignoredBuiltDependencies, overrides, patchedDependencies

### Community 34 - "AIChatBox.tsx"
Cohesion: 0.33
Nodes (5): AIChatBox(), AIChatBoxProps, Message, ScrollArea(), ScrollBar()

### Community 35 - "ErrorBoundary.tsx"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 36 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 38 - "xlsx"
Cohesion: 0.33
Nodes (5): ImportProducts(), ProductionReport(), xlsx, main(), xlsx

### Community 39 - "package.json"
Cohesion: 0.33
Nodes (5): license, name, packageManager, type, version

### Community 40 - "start.sh"
Cohesion: 0.40
Nodes (4): DATABASE_URL, NODE_ENV, PORT, start.sh script

## Knowledge Gaps
- **296 isolated node(s):** `UseAuthOptions`, `AIChatBoxProps`, `CameraDetectedPayload`, `CameraScannerDialogProps`, `MenuItem` (+291 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `react`, `index.ts`, `xlsx`, `package.json`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `axios`, `bcryptjs`, `canvas-confetti`, `class-variance-authority`, `cmdk`, `cookie-parser`, `cookie`, `dotenv`, `embla-carousel-react`, `framer-motion`, `html5-qrcode`, `input-otp`, `jose`, `lucide-react`, `mysql2`, `nanoid`, `next-themes`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react-data-grid`, `react-day-picker`, `react-dom`, `react-hook-form`, `react-resizable-panels`, `recharts`, `sonner`, `streamdown`, `superjson`, `sweetalert2`, `tailwindcss-animate`, `@tanstack/react-query`, `@trpc/client`, `@trpc/react-query`, `vaul`, `wouter`, `zod`, `@zxing/browser`, `@zxing/library`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `LancamentoRepuxados.tsx`, `ComponentShowcase.tsx`, `AIChatBox.tsx`, `ErrorBoundary.tsx`, `toggle-group.tsx`, `sidebar.tsx`, `DashboardLayout.tsx`, `react`, `xlsx`, `alert-dialog.tsx`, `field.tsx`, `input-group.tsx`, `menubar.tsx`, `item.tsx`?**
  _High betweenness centrality (0.296) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `LancamentoRepuxados.tsx`, `ComponentShowcase.tsx`, `toggle-group.tsx`, `sidebar.tsx`, `DashboardLayout.tsx`, `dependencies`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **What connects `UseAuthOptions`, `AIChatBoxProps`, `CameraDetectedPayload` to the rest of the system?**
  _296 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LancamentoRepuxados.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0569289865064513 - nodes in this community are weakly interconnected._
- **Should `ComponentShowcase.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05191256830601093 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06448087431693988 - nodes in this community are weakly interconnected._