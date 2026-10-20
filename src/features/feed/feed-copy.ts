import { useSettings } from '../../app/providers'

const copy = {
  intro: ['Practical knowledge from our clinic, ready to read wherever you are.', 'လမင်း ဆေးခန်းမှ ကျန်းမာရေး အသိပညာများကို အချိန်မရွေး ဖတ်ရှုနိုင်ပါသည်။'],
  search: ['Search article titles…', 'ဆောင်းပါး ခေါင်းစဉ် ရှာရန်…'],
  all: ['All posts', 'အားလုံး'], photos: ['Photos', 'ဓာတ်ပုံ'], videos: ['Videos', 'ဗီဒီယို'],
  articles: ['articles', 'ဆောင်းပါး'], views: ['views', 'ကြည့်ရှုမှု'],
  read: ['Read article', 'ဆက်ဖတ်ရန်'], more: ['Load more articles', 'နောက်ထပ် ဆောင်းပါးများ'],
  loading: ['Loading…', 'ဖွင့်နေသည်…'], retry: ['Try again', 'ပြန်ကြိုးစားရန်'],
  failed: ['We couldn’t load the articles. Check your connection and try again.', 'ဆောင်းပါးများ ဖွင့်၍ မရပါ။ အင်တာနက် စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။'],
  empty: ['New articles are on their way.', 'ဆောင်းပါးအသစ်များ မကြာမီ တင်ပေးပါမည်။'],
  emptyHint: ['Come back for updates from La Min Clinic.', 'လမင်း ဆေးခန်း၏ ဆောင်းပါးအသစ်များကို ပြန်လည် ဝင်ရောက် ဖတ်ရှုနိုင်ပါသည်။'],
  noResults: ['No articles match your search.', 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ဆောင်းပါး မရှိပါ။'],
  clear: ['Clear filters', 'ရှာဖွေမှု ရှင်းရန်'], back: ['Back to articles', 'ဆောင်းပါးများသို့'],
  staff: ['Staff', 'ဝန်ထမ်း'], clinic: ['Clinic', 'ဆေးခန်း'], write: ['Write a post', 'ဆောင်းပါး ရေးရန်'],
  team: ['La Min Clinic team', 'လမင်း ဆေးခန်းအဖွဲ့'], share: ['Share article', 'မျှဝေရန်'], copied: ['Link copied', 'လင့်ခ် ကူးယူပြီးပါပြီ'],
  copyFailed: ['Couldn’t share. Copy the link from your address bar.', 'မျှဝေ၍ မရပါ။ Browser မှ လင့်ခ်ကို ကူးယူပါ။'],
  notFound: ['This article is no longer available.', 'ဤဆောင်းပါးကို မရနိုင်တော့ပါ။'],
  edit: ['Edit post', 'ဆောင်းပါး ပြင်ရန်'], publish: ['Publish post', 'ဆောင်းပါး တင်ရန်'], save: ['Save changes', 'ပြင်ဆင်ချက် သိမ်းရန်'],
  publishing: ['Publishing…', 'တင်နေသည်…'], upload: ['Upload media', 'ဓာတ်ပုံ / ဗီဒီယို ထည့်ရန်'],
  mediaHint: ['Up to 4 files. Photos: JPG, PNG, WebP up to 8 MB. Videos: MP4, WebM up to 30 MB.', 'ဖိုင် ၄ ခုအထိ။ ပုံ JPG၊ PNG၊ WebP 8 MB အထိ။ ဗီဒီယို MP4၊ WebM 30 MB အထိ။'],
  alt: ['Image description', 'ပုံ အကြောင်း ဖော်ပြချက်'], caption: ['Video caption (optional)', 'ဗီဒီယို ဖော်ပြချက် (မဖြစ်မနေ မလိုပါ)'],
  remove: ['Remove attachment', 'ဖိုင် ဖယ်ရန်'], title: ['Article title', 'ဆောင်းပါး ခေါင်းစဉ်'], content: ['Article content', 'ဆောင်းပါး အကြောင်းအရာ'],
  draft: ['Your text draft is saved on this device. Reselect new attachments if you leave this page.', 'ရေးသားထားသော စာကို ဤစက်တွင် အလိုအလျောက် သိမ်းထားပါသည်။ စာမျက်နှာမှ ထွက်ပါက ဖိုင်အသစ်များကို ပြန်ရွေးပါ။'],
  draftFailed: ['Your browser could not save this draft. Keep this page open until you publish or copy your text.', 'Browser တွင် စာမူကို သိမ်း၍ မရပါ။ မတင်မီ စာမျက်နှာကို ဖွင့်ထားပါ သို့မဟုတ် စာကို ကူးယူထားပါ။'],
  publicHint: ['Published posts and attachments are public. Include only media you have permission to share.', 'တင်ထားသော စာနှင့် ဖိုင်များကို လူတိုင်း ကြည့်နိုင်ပါသည်။ မျှဝေခွင့်ရှိသော ဖိုင်များကိုသာ ထည့်ပါ။'],
  delete: ['Delete post', 'ဆောင်းပါး ဖျက်ရန်'], deleteConfirm: ['Delete this post and its media? This cannot be undone.', 'ဤဆောင်းပါးနှင့် ဖိုင်များကို ဖျက်မလား။ ပြန်ယူ၍ မရပါ။'],
  cancel: ['Cancel', 'မလုပ်တော့ပါ'], deleteFailed: ['Couldn’t delete the post. Try again.', 'ဆောင်းပါး ဖျက်၍ မရပါ။ ပြန်ကြိုးစားပါ။'],
  fileError: ['Choose up to 4 supported files within the size limits.', 'သတ်မှတ်အရွယ်အစားအတွင်း ဖိုင် ၄ ခုအထိ ရွေးပါ။'],
  saveFailed: ['Couldn’t publish. Your draft is kept; check your connection and retry.', 'တင်၍ မရပါ။ ရေးထားသော စာကို သိမ်းထားပါသည်။ အင်တာနက် စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။'],
  descriptions: ['Add a short description for each image before publishing.', 'ဆောင်းပါး မတင်မီ ပုံတိုင်းအတွက် ဖော်ပြချက်တို ထည့်ပါ။'],
  localMedia: ['Local demo: images up to 1 MB only. Cloud mode is needed for videos and public sharing.', 'စက်တွင်းစမ်းသပ်မှုတွင် ပုံ 1 MB အထိသာ ထည့်နိုင်ပါသည်။ ဗီဒီယိုနှင့် အများသို့မျှဝေရန် Cloud လိုအပ်ပါသည်။'],
  progress: ['Uploading file', 'ဖိုင် တင်နေသည်'], photo: ['Photo', 'ဓာတ်ပုံ'], video: ['Video', 'ဗီဒီယို'],
  mediaFailed: ['Media unavailable', 'ဖိုင် ဖွင့်၍ မရပါ'], reloadMedia: ['Reload media', 'ဖိုင် ပြန်ဖွင့်ရန်'],
  language: ['Interface language', 'အသုံးပြုမည့် ဘာသာစကား'], leave: ['Leave this page? You will need to reselect new media files.', 'ဤစာမျက်နှာမှ ထွက်မလား။ ဖိုင်အသစ်များကို ပြန်ရွေးရန် လိုပါမည်။'],
  preview: ['Preview', 'နမူနာ ကြည့်ရန်'], finish: ['Back to editing', 'ဆက်ရေးရန်'],
} as const
export type FeedKey = keyof typeof copy
export function useFeedText() {
  const { lang } = useSettings()
  return (key: FeedKey): string => copy[key][lang === 'en' ? 0 : 1]
}
