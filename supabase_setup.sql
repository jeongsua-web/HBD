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
-- 5) 선물 목록 시드 — wish_list.txt 기준 (wishlist.html의 UUID와 동일)
--    on conflict do nothing → 중복 실행 안전
-- ----------------------------------------------------
insert into wishlist_items (id, title, link_url, sort_order) values
  ('00000000-0000-0000-0000-000000000001', '위시',                             'https://gift.kakao.com/product/10343767',                                                                            1),
  ('00000000-0000-0000-0000-000000000002', '넘버즈인 판토텐산 블러 파우더 7g', 'https://numbuzin.com/product/1번-판토텐산-스킨케어100-블러파우더-7g/135/category/100/display/1/',                    2),
  ('00000000-0000-0000-0000-000000000003', '여행용 목베개',                    'https://smartstore.naver.com/gtcare/products/12149502745',                                                           3),
  ('00000000-0000-0000-0000-000000000004', '러쉬 로션',                        'https://gift.kakao.com/product/12111299',                                                                            4),
  ('00000000-0000-0000-0000-000000000005', '올라플렉스 헤어 퍼팩터',            'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000185282',                                  5),
  ('00000000-0000-0000-0000-000000000006', '클로란 쿠푸아수 버터 리페어 샴푸', 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000157789',                                  6),
  ('00000000-0000-0000-0000-000000000007', '네일팁',                           null,                                                                                                                 7),
  ('00000000-0000-0000-0000-000000000008', '토지',                             'https://product.kyobobook.co.kr/detail/S000202594963',                                                               8),
  ('00000000-0000-0000-0000-000000000009', '독서대',                           null,                                                                                                                 9),
  ('00000000-0000-0000-0000-000000000010', '파우치 — 프롬디얼리던',             'https://hottracks.kyobobook.co.kr/gift/detail/S000219303542',                                                        10),
  ('00000000-0000-0000-0000-000000000011', '데스크 매트',                      null,                                                                                                                 11)
on conflict (id) do nothing;

-- ----------------------------------------------------
-- 6) 참석자 (Who's In)
-- ----------------------------------------------------
create table if not exists attendees (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null,
  message    text not null default '',
  created_at timestamptz not null default now(),
  constraint uq_attendee_nickname unique (nickname)
);

create index if not exists idx_attendees_created on attendees (created_at);

-- RLS
alter table attendees enable row level security;
create policy "attendees_select" on attendees for select using (true);
create policy "attendees_insert" on attendees for insert with check (true);
create policy "attendees_delete" on attendees for delete using (true);

-- Realtime
alter publication supabase_realtime add table attendees;

-- 참석자 시드 (가나다 순) — on conflict do nothing → 중복 실행 안전
insert into attendees (nickname) values
  ('김은우'),
  ('김희재'),
  ('남다현'),
  ('이다은'),
  ('이채은'),
  ('장서은'),
  ('최은서'),
  ('최이아름'),
  ('허보윤')
on conflict (nickname) do nothing;

-- ----------------------------------------------------
-- 7) 포토덤프 (Photo Dump)
-- ----------------------------------------------------
create table if not exists photo_dump (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null,
  file_path   text not null,   -- storage 경로: {uuid}.{ext}
  file_name   text not null,   -- 원본 파일명
  created_at  timestamptz not null default now()
);

create index if not exists idx_photos_created on photo_dump (created_at desc);

alter table photo_dump enable row level security;
create policy "photos_select" on photo_dump for select using (true);
create policy "photos_insert" on photo_dump for insert with check (true);

alter publication supabase_realtime add table photo_dump;

-- Storage 버킷 설정 (SQL Editor에서 실행)
-- 버킷 생성 (public = 썸네일 직접 URL 접근 허용)
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true)
  on conflict (id) do nothing;

-- Storage RLS: 누구나 업로드·조회 가능
create policy "storage_photos_insert" on storage.objects
  for insert with check (bucket_id = 'photos');
create policy "storage_photos_select" on storage.objects
  for select using (bucket_id = 'photos');

-- 완료! 🎉
