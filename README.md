# BerlinLead AI

Almanya'da doğrulanmış e-postalı B2B lead'ler (otel, restoran, fabrika, inşaat, temizlik şirketi vb.) bulan, CRM'e otomatik kaydeden ve yöneten bir Next.js SaaS uygulaması. Her kullanıcı kendi hesabıyla giriş yapar ve yalnızca kendi arama geçmişini/lead'lerini görür.

## Nasıl çalışır

- **Dashboard** (`/`): toplam firma, doğrulanmış e-posta, kontak kalite skoru, export sayısı ve sektör/şehir/doğrulama grafikleri.
- **Arama** (`/search`): sektör/anahtar kelime (örn. "otel", "inşaat firması") ve şehir (örn. "Berlin") girip aratırsınız; website/telefon/doğrulanmış e-posta filtreleri uygulanabilir.
- **CRM** (`/leads`): e-postası bulunan tüm firmaların otomatik kaydedildiği liste.
- **Ayarlar** (`/settings`): kendi Apify/Hunter/OpenRouter API anahtarlarınızı, SMTP bilgilerinizi ve dil tercihinizi kaydedin.

Arka planda: `/api/search` üzerinden Apify'ın `compass/crawler-google-places` (Google Maps Scraper) actor'ü çalışır, firma adı/adres/telefon/website/puan çekilir; Hunter.io Domain Search ile eksik e-postalar tamamlanır; her bulunan e-posta Hunter'ın Email Verifier'ı ile doğrulanıp (Geçerli/Riskli/Catch-all/Geçersiz/Bilinmiyor) rozetlenir. Sonuçlar CSV, Excel veya JSON olarak indirilebilir.

## Kurulum (yerel bilgisayarınızda / VS Code'da)

```bash
npm install
```

`.env.local.example` dosyasını `.env.local` olarak kopyalayıp kendi API anahtarlarınızı girin:

```bash
cp .env.local.example .env.local
```

```
APIFY_API_TOKEN=buraya_apify_tokeninizi_yazin
HUNTER_API_KEY=buraya_hunter_api_keyinizi_yazin
```

Ardından geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Auth + CRM (Supabase) kurulumu

Uygulama artık Supabase Auth ile gerçek kullanıcı girişi kullanıyor: her kullanıcı `/login` sayfasından kayıt olur/giriş yapar, ve her arama + CRM kaydı sadece o kullanıcıya ait olur (Row Level Security ile izole edilir).

1. [supabase.com](https://supabase.com) üzerinde bir proje oluşturun (veya mevcut bir projenizi kullanın).
2. Proje panelinde **Authentication > Providers**'da Email/Password girişinin açık olduğunu doğrulayın (varsayılan olarak açıktır).
3. **SQL Editor**'ü açıp aşağıdaki migration'ı çalıştırın:

```sql
-- Kullanıcı bazlı CRM alanları
alter table public.leads
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email_verification_status text
    check (email_verification_status in ('valid','risky','catchall','invalid','unknown'))
    default 'unknown',
  add column if not exists lead_status text
    check (lead_status in ('new','contacted','interested','meeting','negotiation','won','lost'))
    default 'new',
  add column if not exists notes text,
  add column if not exists tags text[] default '{}',
  add column if not exists reminder_at timestamptz,
  add column if not exists is_favorite boolean default false;

-- place_id artık kullanıcı başına benzersiz (aynı firmayı iki farklı kullanıcı bulabilir)
alter table public.leads drop constraint if exists leads_place_id_key;
create unique index if not exists leads_user_place_id_idx on public.leads (user_id, place_id);

-- Kaydedilen aramalar
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  keyword text not null,
  city text not null,
  filters jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Kullanıcı profili (dil tercihi vb.)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  language text default 'tr' check (language in ('tr','en','de')),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.saved_searches enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Service role has full access" on public.leads;
create policy "Users manage own leads"
on public.leads for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');

create policy "Users manage own saved searches"
on public.saved_searches for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');

create policy "Users manage own profile"
on public.profiles for all
using (auth.uid() = id or auth.role() = 'service_role')
with check (auth.uid() = id or auth.role() = 'service_role');

-- Kayıt olunca otomatik profil satırı oluştur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

> **Not:** Auth eklenmeden önce kaydedilmiş lead'ler varsa (`user_id` boş), bu migration'dan sonra hiçbir kullanıcıya ait görünmeyecekler (RLS onları gizler). Test verisiyse sorun değil; gerçek veriyse migration'dan önce `update public.leads set user_id = '<kendi-user-id-iniz>'` ile sahiplendirin.

4. Dashboard'ın çalışması için ikinci bir migration daha çalıştırın (arama geçmişi + export sayacı):

```sql
create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  keyword text not null,
  city text not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.export_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  format text not null check (format in ('csv','xlsx','json')),
  count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.search_history enable row level security;
alter table public.export_log enable row level security;

create policy "Users manage own search history"
on public.search_history for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');

create policy "Users manage own export log"
on public.export_log for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');
```

5. Harita özelliği için firma konum koordinatlarını saklayacak sütunları ekleyin:

```sql
alter table public.leads
  add column if not exists lat double precision,
  add column if not exists lng double precision;
```

> **Not:** Bu migration'dan önce kaydedilmiş lead'lerde `lat`/`lng` boş olacaktır — haritada görünmezler ama diğer her yerde normal çalışmaya devam ederler. Yeni aramalar konumu otomatik doldurur.

6. **Ayarlar** sayfasının (her kullanıcının kendi API anahtarlarını/dil tercihini kaydedebilmesi için) çalışması için son bir migration çalıştırın:

```sql
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apify_api_token text,
  hunter_api_key text,
  openrouter_api_key text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  language text default 'tr' check (language in ('tr','en','de')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
on public.user_settings for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');
```

> **Not:** `/settings` sayfasında bir kullanıcı kendi Apify/Hunter/OpenRouter anahtarını girerse, o kullanıcının aramaları ve AI mesaj üretimi kendi anahtarıyla çalışır (paylaşılan sunucu anahtarları yerine). Boş bırakılırsa `.env.local`'deki paylaşılan varsayılan anahtarlar kullanılmaya devam eder. SMTP alanları şu an sadece saklanıyor; otomatik e-posta gönderimi henüz bu bilgileri kullanmıyor.

7. **Project Settings > API**'den şu üç değeri alıp `.env.local`'e ekleyin (zaten eklenmişse atlayın):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` gizli tutulmalıdır — sadece sunucu tarafı kodda (`/api/*`) kullanılır, tarayıcıya asla gönderilmez.

## API anahtarları nasıl alınır

**Apify:** [console.apify.com/sign-up](https://console.apify.com/sign-up) üzerinde ücretsiz hesap açın, Settings > Integrations'tan "Personal API token"ı kopyalayın. Google Maps Scraper actor'ü kabaca $1,50-2,10 / 1.000 firma ücretlendirilir (Temmuz 2026 fiyatı).

**Hunter.io:** [hunter.io](https://hunter.io) üzerinde ücretsiz hesap açın, Settings > API'den anahtarınızı alın. Hunter, verinizi kendi ürününüzde/SaaS'ınızda kullanmanıza standart planlarında izin veriyor (Data Platform), bu yüzden bu projeyi ticari bir ürüne dönüştürecekseniz Apollo yerine Hunter tercih edildi.

## Vercel'e deploy

```bash
npx vercel
```

Deploy sırasında `APIFY_API_TOKEN` ve `HUNTER_API_KEY` ortam değişkenlerini Vercel proje ayarlarından (Settings > Environment Variables) eklemeyi unutmayın.

## Notlar

- Her arama bir Apify "run" başlatır ve sonuçlar hazır olana kadar bekler (genelde birkaç saniye - birkaç dakika, istenen sonuç sayısına göre değişir).
- "Maksimum Sonuç" alanıyla her aramada kaç firma çekileceğini sınırlayarak maliyeti kontrol edebilirsiniz.
- E-posta bulma oranı %100 değildir — küçük/bağımsız işletmelerin bir kısmında hiç e-posta bulunamayabilir.
- Bu projeyi bir SaaS olarak başkalarına sunmayı planlıyorsanız, kullandığınız her veri sağlayıcının (Apify, Hunter, Google Places vb.) güncel kullanım şartlarını kendiniz de teyit edin — bu README hukuki tavsiye değildir.
