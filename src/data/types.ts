export interface Visit {
  id: string
  /** Ledger day the visit belongs to, YYYY-MM-DD (device local time). */
  date: string
  patientName: string
  age: number | null
  diagnosis: string
  /** Fee in MMK. */
  fee: number
  createdAt: number
  updatedAt: number
}

export interface VisitDraft {
  date: string
  patientName: string
  age: number | null
  diagnosis: string
  fee: number
}

export interface RecentName {
  name: string
  age: number | null
}

export interface Article {
  id: string
  title: string
  body: string
  authorEmail: string | null
  createdAt: number
  updatedAt: number
  media: ArticleMedia[]
  viewCount: number
}

export interface ArticleMedia {
  path: string
  url: string
  kind: 'image' | 'video'
  alt: string
  width?: number
  height?: number
}

export interface ArticleDraft {
  title: string
  body: string
  media?: ArticleMedia[]
}

export interface ArticleQuery {
  offset?: number
  search?: string
  kind?: 'all' | 'image' | 'video'
}

export interface ArticlePage {
  articles: Article[]
  total: number
}

export interface FeedStats { posts: number; views: number }

export interface ArticleRepository {
  list(query?: ArticleQuery): Promise<ArticlePage>
  get(id: string): Promise<Article | null>
  stats(): Promise<FeedStats>
  recordView(id: string, visitorId: string): Promise<number>
  uploadMedia(file: File): Promise<ArticleMedia>
  removeMedia(media: ArticleMedia[]): Promise<void>
  create(draft: ArticleDraft, authorEmail: string | null): Promise<Article>
  update(id: string, draft: ArticleDraft, expectedUpdatedAt?: number): Promise<Article>
  delete(id: string): Promise<void>
}

export interface VisitRepository {
  listByDate(date: string): Promise<Visit[]>
  listByDateRange(from: string, to: string): Promise<Visit[]>
  listRecentNames(sinceDate: string): Promise<RecentName[]>
  saveVisit(draft: VisitDraft, existing?: Visit): Promise<Visit>
  deleteVisit(id: string): Promise<void>
  exportAll(): Promise<Visit[]>
  importAll?(visits: Visit[]): Promise<number>
}
