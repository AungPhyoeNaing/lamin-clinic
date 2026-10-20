import { useCallback } from 'react'
import { useSettings, type Lang } from '../app/providers'

export interface Label {
  my: string
  en: string
}

export const dict = {
  appName: { my: 'လမင်း ဆေးခန်း', en: 'La Min Clinic' },
  city: { my: 'မန္တလေး', en: 'Mandalay' },
  ledger: { my: 'မှတ်တမ်း', en: 'Ledger' },
  reports: { my: 'အစီရင်ခံစာ', en: 'Reports' },
  settings: { my: 'ဆက်တင်', en: 'Settings' },
  today: { my: 'ယနေ့', en: 'Today' },
  visits: { my: 'လူနာ', en: 'Visits' },
  total: { my: 'စုစုပေါင်း', en: 'Total' },
  patientName: { my: 'လူနာအမည်', en: 'Patient name' },
  patientPlaceholder: { my: 'အမည် ရေးပါ', en: 'Type patient name' },
  age: { my: 'အသက်', en: 'Age' },
  ageUnit: { my: 'နှစ်', en: 'yrs' },
  diagnosis: { my: 'ရောဂါ', en: 'Diagnosis' },
  diagnosisPlaceholder: { my: 'ရောဂါ သို့မဟုတ် မှတ်ချက် ရေးပါ', en: 'Diagnosis or notes' },
  fee: { my: 'ကုသခ', en: 'Fee' },
  feeUnit: { my: 'ကျပ်', en: 'Ks' },
  addVisit: { my: 'လူနာမှတ်တမ်း ထည့်ရန်', en: 'Add visit' },
  editVisit: { my: 'မှတ်တမ်း ပြင်ရန်', en: 'Edit visit' },
  save: { my: 'သိမ်းရန်', en: 'Save' },
  saving: { my: 'သိမ်းနေသည်...', en: 'Saving...' },
  cancel: { my: 'ပယ်ဖျက်', en: 'Cancel' },
  delete: { my: 'ဖျက်ရန်', en: 'Delete' },
  confirmDelete: {
    my: 'ဖျက်မှာ သေချာပါသလား? ပြန်ယူလို့ မရပါ',
    en: 'Delete this entry? This cannot be undone',
  },
  confirmDeleteAction: { my: 'သေချာသည် — ဖျက်ပါ', en: 'Yes, delete' },
  required: { my: 'ဖြည့်ရန် လိုအပ်ပါသည်', en: 'Required' },
  invalidAmount: { my: 'မှန်ကန်သော ပမာဏ ထည့်ပါ', en: 'Enter a valid amount' },
  invalidAge: { my: 'အသက်ကို မှန်ကန်စွာ ထည့်ပါ', en: 'Enter a valid age' },
  noVisitsTitle: { my: 'ဤနေ့အတွက် မှတ်တမ်း မရှိသေးပါ', en: 'No visits recorded yet' },
  noVisitsHint: {
    my: 'အောက်ပါ + ခလုတ်ကို နှိပ်ပြီး ပထမဆုံး လူနာကို မှတ်တမ်းတင်ပါ',
    en: 'Tap + to record the first patient of the day',
  },
  loading: { my: 'ဖွင့်နေသည်...', en: 'Loading...' },
  retry: { my: 'ပြန်ကြိုးစားရန်', en: 'Retry' },
  cloudSyncOn: { my: 'Cloud နှင့် ချိတ်ထားသည်', en: 'Cloud sync on' },
  offline: {
    my: 'အော့ဖ်လိုင်း — ပြန်ရရင် အလိုအလျောက် ပို့ပါမည်',
    en: 'Offline — will sync when back online',
  },
  localOnly: { my: 'ဤစက်ပစ္စည်းအတွင်း သိမ်းထားသည်', en: 'Stored on this device' },
  monthTotal: { my: 'လစဉ် စုစုပေါင်း', en: 'Month total' },
  activeDays: { my: 'ဖွင့်ရက်', en: 'Active days' },
  avgPerVisit: { my: 'တစ်ဦး ပျမ်းမျှ', en: 'Avg / visit' },
  exportCsv: { my: 'CSV ရယူရန်', en: 'Export CSV' },
  print: { my: 'ပရင့် ထုတ်ရန်', en: 'Print' },
  backupJson: { my: 'အရန် ကူးယူရန် (JSON)', en: 'Backup (JSON)' },
  allRecordsCsv: { my: 'မှတ်တမ်း အားလုံး (CSV)', en: 'All records (CSV)' },
  backupHint: { my: 'လစဉ် တစ်ခါ အရန် ကူးယူထားပါ', en: 'Back up once a month to keep your data safe' },
  language: { my: 'ဘာသာစကား', en: 'Language' },
  langMy: { my: 'မြန်မာ', en: 'Burmese' },
  langEn: { my: 'English', en: 'English' },
  langBoth: { my: 'မြန်မာ + English', en: 'Burmese + English' },
  defaultFee: { my: 'ပုံသေ ကုသခ', en: 'Default fee' },
  defaultFeeHint: {
    my: 'မှတ်တမ်းအသစ် ဖွင့်တိုင်း ဒီငွေကို အလိုအလျောက် ဖြည့်ပေးမည်',
    en: 'Pre-filled automatically when adding a new visit',
  },
  account: { my: 'အကောင့်', en: 'Account' },
  logout: { my: 'ထွက်ရန်', en: 'Log out' },
  signIn: { my: 'ဝင်ရောက်ရန်', en: 'Sign in' },
  signingIn: { my: 'ဝင်ရောက်နေသည်...', en: 'Signing in...' },
  email: { my: 'အီးမေးလ်', en: 'Email' },
  password: { my: 'စကားဝှက်', en: 'Password' },
  loginError: { my: 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားနေပါသည်', en: 'Wrong email or password' },
  data: { my: 'ဒေတာ', en: 'Data' },
  installTitle: { my: 'ဖုန်းတွင် app အနေဖြင့် သွင်းရန်', en: 'Install on your phone' },
  installHint: {
    my: 'Browser menu (⋮) ကို နှိပ်ပြီး "Add to Home Screen" ကို ရွေးပါ',
    en: 'Open the browser menu and choose "Add to Home Screen"',
  },
  about: { my: 'အကြောင်း', en: 'About' },
  entries: { my: 'မှတ်တမ်း', en: 'entries' },
  syncCloudHint: {
    my: 'စက်တွင်းဒေတာကို အင်တာနက်မရှိဘဲ သုံးနိုင်သည်။ Cloud ဒေတာအတွက် အင်တာနက် လိုအပ်သည်။',
    en: 'Local records work offline. Cloud records require internet; changes are not queued offline.',
  },
  version: { my: 'ဗားရှင်း', en: 'Version' },
  pickDate: { my: 'ရက်စွဲ ရွေးရန်', en: 'Pick a date' },
  prevDay: { my: 'ယမန်နေ့', en: 'Previous day' },
  nextDay: { my: 'နောက်နေ့', en: 'Next day' },
  prevMonth: { my: 'ပြီးခဲ့သည့်လ', en: 'Previous month' },
  nextMonth: { my: 'နောက်လ', en: 'Next month' },
  close: { my: 'ပိတ်ရန်', en: 'Close' },
  add: { my: 'ထည့်ရန်', en: 'Add' },
  monthReportTitle: { my: 'လစဉ် အစီရင်ခံစာ', en: 'Monthly report' },
  allEntries: { my: 'မှတ်တမ်း အားလုံး', en: 'All entries' },
  noDataMonth: { my: 'ဤလအတွက် မှတ်တမ်း မရှိပါ', en: 'No records this month' },
  createdAt: { my: 'မှတ်တမ်းတင်ချိန်', en: 'Recorded' },
  searchPatients: { my: 'လူနာ ရှာဖွေရန်', en: 'Search patients...' },
  searchPlaceholder: { my: 'အမည် သို့မဟုတ် ရောဂါ ဖြင့် ရှာပါ...', en: 'Search by name or diagnosis...' },
  noSearchResults: { my: 'ရှာဖွေမှုနှင့် ကိုက်ညီသော မှတ်တမ်း မရှိပါ', en: 'No matching records found' },
  clearSearch: { my: 'ရှင်းရန်', en: 'Clear' },
  quickFeePresets: { my: 'အမြန် နှုန်းထားများ', en: 'Quick presets' },
  restoreJson: { my: 'အရန်ဖိုင် ပြန်သွင်းရန် (JSON)', en: 'Restore backup (JSON)' },
  restoreSuccess: { my: 'ဒေတာ အောင်မြင်စွာ ပြန်သွင်းပြီးပါပြီ', en: 'Data restored successfully' },
  restoreError: { my: 'ဖိုင် မမှန်ကန်ပါ သို့မဟုတ် ပျက်စီးနေပါသည်', en: 'Invalid backup file' },
  restoreConfirm: { my: 'ဤဖိုင်မှ ဒေတာများကို ပေါင်းထည့်ရန် သေချာပါသလား?', en: 'Import and merge records from this backup file?' },
  avgFee: { my: 'ပျမ်းမျှ ကုသခ', en: 'Avg fee' },
  highestDay: { my: 'အများဆုံးနေ့', en: 'Highest day' },
  totalRevenue: { my: 'စုစုပေါင်း ဝင်ငွေ', en: 'Total revenue' },
  showPassword: { my: 'စကားဝှက် ပြရန်', en: 'Show password' },
  hidePassword: { my: 'စကားဝှက် ဝှက်ရန်', en: 'Hide password' },
  clinicDetails: { my: 'ဆေးခန်း အချက်အလက်', en: 'Clinic details' },
  feed: { my: 'ကျန်းမာရေး ဆောင်းပါးများ', en: 'Health feed' },
  noArticles: { my: 'ဆောင်းပါး မရှိသေးပါ', en: 'No articles yet' },
  postArticle: { my: 'ဆောင်းပါး တင်ရန်', en: 'Post article' },
  articleTitle: { my: 'ခေါင်းစဉ်', en: 'Title' },
  articleBody: { my: 'အကြောင်းအရာ', en: 'Content' },
  deleteArticle: { my: 'ဆောင်းပါး ဖျက်ရန်', en: 'Delete article' },
  dailyRevenue: { my: 'နေ့စဉ် ဝင်ငွေ', en: 'Daily revenue' },
  dailyBreakdown: { my: 'နေ့စဉ် စာရင်း', en: 'Daily breakdown' },
  openDay: { my: 'နေ့စဉ်မှတ်တမ်း ကြည့်ရန် ရွေးပါ', en: 'Select a bar to open the day’s ledger' },
  recentPatients: { my: 'ပြီးခဲ့သည့် ရက် ၉၀ အတွင်း လူနာများ', en: 'Recent patients (last 90 days)' },
  adminArea: { my: 'Admin', en: 'Admin' },
  lockIcon: { my: 'Admin access', en: 'Admin access' },
} as const satisfies Record<string, Label>

export type TKey = keyof typeof dict

export interface Word {
  text: string
  lang: 'my' | 'en'
}

export interface Translated {
  primary: Word
  secondary?: Word
}

export function translate(key: TKey, lang: Lang): Translated {
  const entry: Label = dict[key]
  if (lang === 'my') return { primary: { text: entry.my, lang: 'my' } }
  if (lang === 'en') return { primary: { text: entry.en, lang: 'en' } }
  return {
    primary: { text: entry.my, lang: 'my' },
    secondary: { text: entry.en, lang: 'en' },
  }
}

export function useI18n(): (key: TKey) => Translated {
  const { lang } = useSettings()
  return useCallback((key: TKey) => translate(key, lang), [lang])
}

/** Primary-language text only, for compact UI like buttons and placeholders. */
export function useText(key: TKey): string {
  const t = useI18n()
  return t(key).primary.text
}

interface TProps {
  k: TKey
  className?: string
  /** Classes for the secondary (English) line. Pass an inline style to keep it on one line. */
  subClassName?: string
}

export function T({ k, className = '', subClassName = 'block text-[0.75em] text-muted' }: TProps) {
  const t = useI18n()
  const { primary, secondary } = t(k)
  return (
    <span className={className}>
      <span className={primary.lang === 'my' ? 'mm' : undefined}>{primary.text}</span>
      {secondary && (
        <span className={`${secondary.lang === 'my' ? 'mm ' : ''}${subClassName}`}>
          {' '}{secondary.text}
        </span>
      )}
    </span>
  )
}
