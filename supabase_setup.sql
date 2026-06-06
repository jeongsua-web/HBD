-- =====================================================
-- 🎀 수아의 생일파티 — Supabase 초기 설정 SQL
-- PRD 5장(백엔드 & 데이터 모델) 기준
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN
-- =====================================================

-- ----------------------------------------------------
-- 1) 테이블
-- ----------------------------------------------------

-- 공지 확인 댓글 (F5)
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- 위시리스트 선물 항목 (F6, 호스트가 사전 입력)
create table if not exists wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  image_url   text,
  link_url    text,            -- 구매 아웃링크
  price       text,
  sort_order  int not null default 0
);

-- 찜 (F6, 선물 1개당 1행 = 1명 독점)
create table if not exists wishlist_claims (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references wishlist_items(id) on delete cascade,
  nickname    text not null,
  created_at  timestamptz not null default now(),
  -- 선물 1개당 1명만 → item_id 유일
  constraint uq_claim_item unique (item_id)
);

-- 조회 최적화
create index if not exists idx_comments_created   on comments (created_at);
create index if not exists idx_claims_nickname     on wishlist_claims (nickname);
create index if not exists idx_items_sort          on wishlist_items (sort_order);


-- ----------------------------------------------------
-- 2) "1인당 최대 3개" 서버단 보강 (트리거)
--    클라이언트 검증과 별개로 DB에서도 막아 안전성 확보
-- ----------------------------------------------------
create or replace function check_claim_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from wishlist_claims where nickname = new.nickname) >= 3 then
    raise exception '한 사람당 최대 3개까지만 찜할 수 있어요 🎀';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_claim_limit on wishlist_claims;
create trigger trg_claim_limit
  before insert on wishlist_claims
  for each row execute function check_claim_limit();


-- ----------------------------------------------------
-- 3) Row Level Security (RLS)
--    인증 없이 anon 키로 접근하므로 정책으로 통제
-- ----------------------------------------------------
alter table comments        enable row level security;
alter table wishlist_items  enable row level security;
alter table wishlist_claims enable row level security;

-- 댓글: 누구나 읽기/쓰기 가능, 수정·삭제 불가
create policy "comments_select" on comments
  for select using (true);
create policy "comments_insert" on comments
  for insert with check (true);

-- 선물 항목: 읽기만 가능 (등록은 호스트가 콘솔에서 직접)
create policy "items_select" on wishlist_items
  for select using (true);

-- 찜: 누구나 읽기/찜하기 가능
create policy "claims_select" on wishlist_claims
  for select using (true);
create policy "claims_insert" on wishlist_claims
  for insert with check (true);
-- 찜 취소: 삭제 허용 (닉네임 일치 검증은 클라이언트에서 수행 — 파티용 신뢰 모델)
create policy "claims_delete" on wishlist_claims
  for delete using (true);


-- ----------------------------------------------------
-- 4) Realtime 활성화
--    댓글/찜이 모든 접속자에게 즉시 반영되도록 publication 등록
-- ----------------------------------------------------
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table wishlist_claims;


-- ----------------------------------------------------
-- 5) (선택) 선물 목록 시드 예시 — wish_list.txt 확정 후 교체
--    title / price / link_url / image_url / sort_order
-- ----------------------------------------------------
-- insert into wishlist_items (title, price, link_url, image_url, sort_order) values
--   ('예시 선물 A', '29,000원', 'https://...', 'https://.../a.jpg', 1),
--   ('예시 선물 B', '15,000원', 'https://...', 'https://.../b.jpg', 2);

-- 완료! 🎉
