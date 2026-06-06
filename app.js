const SUPABASE_URL      = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const isConfigured = SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
const sb = isConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const MAX_CLAIMS = 3;

// ── 카운트다운 ────────────────────────────────────
const TARGET = new Date("2026-06-29T17:00:00").getTime();
function tick(){
  const diff = TARGET - Date.now();
  const el = document.getElementById("countdown");
  const tb = document.getElementById("tbTimer");
  if(diff <= 0){
    el.textContent = "💖 IT'S SHOW TIME! 💖";
    tb.textContent = "SHOW TIME 💖";
    return;
  }
  const d=Math.floor(diff/86400000),
        h=Math.floor((diff%86400000)/3600000),
        m=Math.floor((diff%3600000)/60000),
        s=Math.floor((diff%60000)/1000);
  const str = `D-${d}  ${pad(h)}:${pad(m)}:${pad(s)}`;
  el.textContent = str; tb.textContent = str;
}
function pad(n){return String(n).padStart(2,"0")}
tick(); setInterval(tick,1000);

function updateClock(){
  const n=new Date();
  document.getElementById("tbClock").textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}`;
}
updateClock(); setInterval(updateClock,10000);

// ── 초기화 ────────────────────────────────────────
window.onload = function(){
  if(!isConfigured) document.getElementById("configWarning").style.display="block";
  const saved = localStorage.getItem("barbie_nickname");
  if(!saved){
    document.getElementById("nicknameModal").style.display="flex";
  } else {
    initUser(saved);
  }
  if(sb){ loadComments(); loadWishlist(); subscribeRealtime(); }
};

function getNick(){ return localStorage.getItem("barbie_nickname"); }

function saveNickname(){
  const v = document.getElementById("nicknameInput").value.trim();
  if(!v){ alert("닉네임을 입력해줘! 💋"); return; }
  localStorage.setItem("barbie_nickname", v);
  document.getElementById("nicknameModal").style.display="none";
  initUser(v);
  if(sb) loadWishlist();
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nicknameInput").addEventListener("keydown", e => { if(e.key==="Enter") saveNickname(); });
});

function initUser(nick){
  const nd = document.getElementById("nickDisplay");
  nd.textContent = `✦ ${nick} 님 입장 ✦`;
  nd.style.display = "inline-block";
}

// ── 플레이어 ──────────────────────────────────────
const TRACKS = ["","","",""];
let curTrack = 0;
const audio = document.getElementById("bgAudio");

const PLAY_ICON  = '<span class="msym" style="font-size:22px">play_circle</span>';
const PAUSE_ICON = '<span class="msym" style="font-size:22px">pause_circle</span>';

function playTrack(el, idx){
  document.querySelectorAll(".pl li").forEach(li => li.classList.remove("active"));
  el.classList.add("active");
  curTrack = idx;
  const titles = ["pink friday","barbie girl","levitating","supernova"];
  document.getElementById("nowPlayingTitle").textContent = titles[idx] || "—";
  if(TRACKS[idx]){
    audio.src = TRACKS[idx];
    audio.play();
    document.getElementById("playBtn").innerHTML = PAUSE_ICON;
  }
}
function togglePlay(){
  if(!TRACKS[curTrack]) return;
  if(audio.paused){ audio.play(); document.getElementById("playBtn").innerHTML = PAUSE_ICON; }
  else { audio.pause(); document.getElementById("playBtn").innerHTML = PLAY_ICON; }
}
function prevTrack(){
  const items = document.querySelectorAll(".pl li");
  curTrack = (curTrack - 1 + items.length) % items.length;
  playTrack(items[curTrack], curTrack);
}
function nextTrack(){
  const items = document.querySelectorAll(".pl li");
  curTrack = (curTrack + 1) % items.length;
  playTrack(items[curTrack], curTrack);
}
audio.addEventListener("ended", nextTrack);
audio.addEventListener("timeupdate", () => {
  if(!audio.duration) return;
  document.getElementById("playerBar").style.width = (audio.currentTime/audio.duration*100)+"%";
});

// ── 댓글 ──────────────────────────────────────────
async function loadComments(){
  const {data,error} = await sb.from("comments").select("*").order("created_at",{ascending:true});
  if(error){ console.error(error); return; }
  const list = document.getElementById("commentList");
  list.innerHTML = "";
  if(!data||data.length===0){
    list.innerHTML=`<li class="comment-empty">공지 정독했으면 닉네임 파서 댓글 달아라~!! 👑</li>`;
    return;
  }
  data.forEach(addCommentItem);
}
function addCommentItem(c){
  const list = document.getElementById("commentList");
  const empty = list.querySelector(".comment-empty");
  if(empty) empty.remove();
  const li = document.createElement("li");
  li.className = "comment-item";
  li.innerHTML = `<span class="comment-author">${esc(c.nickname)}</span>${esc(c.message)}`;
  list.appendChild(li);
}
async function handleCommentSubmit(e){
  e.preventDefault();
  const nick = getNick();
  if(!nick){ alert("닉네임 설정이 필요해! 💋"); return; }
  if(!sb){ alert("Supabase 설정이 필요해요 ⚙️"); return; }
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if(!text) return;
  input.value = "";
  const {error} = await sb.from("comments").insert({nickname:nick, message:text});
  if(error){ console.error(error); alert("댓글 등록 실패 🥲"); input.value=text; }
}

// ── 위시리스트 ────────────────────────────────────
async function loadWishlist(){
  const grid = document.getElementById("wishGrid");
  const [ir,cr] = await Promise.all([
    sb.from("wishlist_items").select("*").order("sort_order"),
    sb.from("wishlist_claims").select("*")
  ]);
  if(ir.error||cr.error){
    grid.innerHTML=`<div class="wish-empty">위시리스트를 불러오지 못했어요 🥲</div>`;
    return;
  }
  const items=ir.data||[], claims=cr.data||[];
  const myNick=getNick();
  const claimMap={};
  claims.forEach(c=>{claimMap[c.item_id]=c;});
  const myCount=claims.filter(c=>c.nickname===myNick).length;
  if(items.length===0){
    grid.innerHTML=`<div class="wish-empty">선물 목록이 곧 채워질 예정! 🎁</div>`;
    return;
  }
  grid.innerHTML="";
  items.forEach(item=>{
    const claim=claimMap[item.id];
    const isMine=claim&&claim.nickname===myNick;
    const card=document.createElement("div");
    card.className="wish-card"+(claim?" claimed":"");
    let html=item.image_url
      ?`<img class="wish-img" src="${escAttr(item.image_url)}" alt="${escAttr(item.title)}" loading="lazy">`
      :`<div class="wish-img-ph">🎁</div>`;
    html+=`<div class="wish-info">`;
    html+=`<div class="wish-title">${esc(item.title)}</div>`;
    if(item.price) html+=`<div class="wish-price">${esc(item.price)}</div>`;
    if(item.link_url) html+=`<a class="wish-link" href="${escAttr(item.link_url)}" target="_blank" rel="noopener">🛒 보러가기</a>`;
    if(claim){
      html+=`<div class="claimed-badge">♡ ${esc(claim.nickname)}님이 찜!</div>`;
      if(isMine) html+=`<button class="unclaim-btn" onclick="unclaim('${item.id}')">찜 취소</button>`;
    } else {
      const full=myCount>=MAX_CLAIMS;
      html+=`<button class="wish-btn primary" ${full?"disabled":""} onclick="claim('${item.id}')">${full?"3개 꽉참 🎀":"찜하기 💖"}</button>`;
    }
    html+=`</div>`;
    card.innerHTML=html;
    grid.appendChild(card);
  });
}
async function claim(itemId){
  const nick=getNick();
  if(!nick){ alert("닉네임 설정이 필요해! 💋"); return; }
  const {error}=await sb.from("wishlist_claims").insert({item_id:itemId,nickname:nick});
  if(error) alert(error.code==="23505"?"앗! 방금 다른 친구가 먼저 찜했어요 🥲":(error.message||"찜 실패 🥲"));
  loadWishlist();
}
async function unclaim(itemId){
  const nick=getNick();
  const {error}=await sb.from("wishlist_claims").delete().eq("item_id",itemId).eq("nickname",nick);
  if(error) alert("찜 취소 실패 🥲");
  loadWishlist();
}

// ── 실시간 구독 ───────────────────────────────────
function subscribeRealtime(){
  sb.channel("comments-ch")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"comments"},p=>addCommentItem(p.new))
    .subscribe();
  sb.channel("claims-ch")
    .on("postgres_changes",{event:"*",schema:"public",table:"wishlist_claims"},()=>loadWishlist())
    .subscribe();
}

// ── 유틸 ──────────────────────────────────────────
function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function escAttr(s){ return esc(s); }
