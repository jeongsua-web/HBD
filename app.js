const SUPABASE_URL      = "https://kdwljcgqaostcdgalnht.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2xqY2dxYW9zdGNkZ2Fsbmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDEyMTAsImV4cCI6MjA5NzYxNzIxMH0.Icf3BeFbhuW1mknK-2eJxGDj0qrCuFwvj14Oyuhazr8";

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
    if(el) el.textContent = "💖 IT'S SHOW TIME! 💖";
    if(tb) tb.textContent = "SHOW TIME 💖";
    return;
  }
  const d=Math.floor(diff/86400000),
        h=Math.floor((diff%86400000)/3600000),
        m=Math.floor((diff%3600000)/60000),
        s=Math.floor((diff%60000)/1000);
  const str = `D-${d}  ${pad(h)}:${pad(m)}:${pad(s)}`;
  if(el) el.textContent = str;
  if(tb) tb.textContent = str;
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
  const cw = document.getElementById("configWarning");
  if(!isConfigured && cw) cw.style.display="block";
  const saved = localStorage.getItem("barbie_nickname");
  if(!saved){
    const modal = document.getElementById("nicknameModal");
    if(modal) modal.style.display="flex";
  } else {
    initUser(saved);
  }
  if(sb){ loadComments(); loadWishlist(); loadPhotoDump(); subscribeRealtime(); }
};

function getNick(){ return localStorage.getItem("barbie_nickname"); }

function saveNickname(){
  const v = document.getElementById("nicknameInput").value.trim();
  if(!v){ alert("닉네임을 입력해줘! 💋"); return; }
  localStorage.setItem("barbie_nickname", v);
  document.getElementById("nicknameModal").style.display="none";
  initUser(v);
  updateNavNick();
  if(sb) loadWishlist();
}

// 닉네임 변경: 현재 닉네임을 채운 채로 입력 모달을 다시 띄움
function changeNickname(){
  const modal = document.getElementById("nicknameModal");
  const input = document.getElementById("nicknameInput");
  if(input) input.value = getNick() || "";
  if(modal) modal.style.display = "flex";
  if(input){ input.focus(); input.select(); }
}

// 네비바 변경 버튼에 현재 닉네임을 괄호로 표시
function updateNavNick(){
  const el = document.getElementById("navNick");
  const nick = getNick();
  if(el) el.textContent = nick ? ` (${nick})` : "";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nicknameInput").addEventListener("keydown", e => { if(e.key==="Enter") saveNickname(); });
  updateNavNick();
});

function initUser(nick){
  const nd = document.getElementById("nickDisplay");
  if(!nd) return;
  nd.textContent = `✦ ${nick} 님 입장 ✦`;
  nd.style.display = "inline-block";
}

// ── 플레이어 (YouTube IFrame API) ─────────────────
const TRACKS = [
  { id:"TxZwCpgxttQ", title:"Speed Drive",    artist:"Charli XCX" },
  { id:"hCLkVrp_4CE", title:"Dance The Night", artist:"Dua Lipa"   },
];
let curTrack = 0;
let ytPlayer = null;
let ytReady  = false;
let progTimer = null;

const PLAY_ICON  = '<span class="msym" style="font-size:22px">play_circle</span>';
const PAUSE_ICON = '<span class="msym" style="font-size:22px">pause_circle</span>';

// YouTube IFrame API 로드 완료 시 자동 호출 (전역)
function onYouTubeIframeAPIReady(){
  if(!document.getElementById("ytPlayer")) return;  // 플레이어 없는 페이지는 무시
  ytPlayer = new YT.Player("ytPlayer", {
    height:"180", width:"320",
    playerVars:{ playsinline:1, controls:0, rel:0 },
    events:{
      onReady: () => { ytReady = true; },
      onStateChange: onYtState
    }
  });
}

function onYtState(e){
  const playBtn = document.getElementById("playBtn");
  if(e.data === YT.PlayerState.PLAYING){
    if(playBtn) playBtn.innerHTML = PAUSE_ICON;
    startProg();
  } else if(e.data === YT.PlayerState.PAUSED){
    if(playBtn) playBtn.innerHTML = PLAY_ICON;
    stopProg();
  } else if(e.data === YT.PlayerState.ENDED){
    nextTrack();
  }
}

function startProg(){
  stopProg();
  progTimer = setInterval(() => {
    if(!ytPlayer || !ytPlayer.getDuration) return;
    const dur = ytPlayer.getDuration();
    if(!dur) return;
    const bar = document.getElementById("playerBar");
    if(bar) bar.style.width = (ytPlayer.getCurrentTime()/dur*100) + "%";
  }, 500);
}
function stopProg(){ if(progTimer){ clearInterval(progTimer); progTimer = null; } }

function setActiveTrack(idx){
  const items = document.querySelectorAll(".pl li");
  items.forEach(li => li.classList.remove("active"));
  if(items[idx]) items[idx].classList.add("active");
  curTrack = idx;
  const titleEl = document.getElementById("nowPlayingTitle");
  if(titleEl && TRACKS[idx]) titleEl.textContent = TRACKS[idx].title;
}

function playTrack(el, idx){
  setActiveTrack(idx);
  if(!ytReady || !ytPlayer) return;
  ytPlayer.loadVideoById(TRACKS[idx].id);
  ytPlayer.playVideo();
}
function togglePlay(){
  if(!ytReady || !ytPlayer) return;
  const state = ytPlayer.getPlayerState();
  if(state === YT.PlayerState.PLAYING){
    ytPlayer.pauseVideo();
  } else if(state === YT.PlayerState.PAUSED){
    ytPlayer.playVideo();
  } else {
    playTrack(null, curTrack);   // 첫 재생: 현재 트랙 로드
  }
}
function prevTrack(){ playTrack(null, (curTrack - 1 + TRACKS.length) % TRACKS.length); }
function nextTrack(){ playTrack(null, (curTrack + 1) % TRACKS.length); }

// ── 댓글 ──────────────────────────────────────────
async function loadComments(){
  const {data,error} = await sb.from("comments").select("*").order("created_at",{ascending:true});
  if(error){ console.error(error); return; }
  const list = document.getElementById("commentList");
  if(!list) return;
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
  if(!grid) return;
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

// ── 포토덤프 ──────────────────────────────────────
const MAX_PHOTO_SIZE = 20 * 1024 * 1024;

async function loadPhotoDump(){
  const grid = document.getElementById("photoDumpGrid");
  if(!grid) return;
  const {data,error} = await sb.from("photo_dump").select("*").order("created_at",{ascending:false});
  if(error){ console.error(error); return; }
  grid.innerHTML = "";
  if(!data||data.length===0){
    grid.innerHTML = `<div class="photo-dump-empty">아직 사진이 없어! 첫 번째로 올려봐 📸</div>`;
    return;
  }
  data.forEach(addPhotoCard);
}

function addPhotoCard(photo){
  const grid = document.getElementById("photoDumpGrid");
  if(!grid) return;
  const empty = grid.querySelector(".photo-dump-empty");
  if(empty) empty.remove();
  const {data:urlData} = sb.storage.from("photos").getPublicUrl(photo.file_path);
  const card = document.createElement("div");
  card.className = "photo-card";
  card.innerHTML =
    `<img class="photo-card-img" src="${escAttr(urlData.publicUrl)}" alt="${escAttr(photo.file_name)}" loading="lazy" data-url="${escAttr(urlData.publicUrl)}" onclick="openPhotoLightbox(this.dataset.url)">` +
    `<div class="photo-card-footer">` +
      `<span class="photo-card-nick">${esc(photo.nickname)}</span>` +
      `<button class="photo-dl-btn" data-path="${escAttr(photo.file_path)}" data-name="${escAttr(photo.file_name)}" onclick="downloadPhoto(this.dataset.path,this.dataset.name)">` +
        `<span class="msym" style="font-size:12px">download</span>DL` +
      `</button>` +
    `</div>`;
  grid.insertBefore(card, grid.firstChild);
}

// 업로드 전 이미지 압축: 최대 2048px로 리사이즈 + JPEG 품질 0.9
function compressImage(file, maxSize=2048, quality=0.9){
  return new Promise((resolve,reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      let {width,height} = img;
      if(width > maxSize || height > maxSize){
        if(width >= height){ height = Math.round(height*maxSize/width); width = maxSize; }
        else { width = Math.round(width*maxSize/height); height = maxSize; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(b=> b ? resolve(b) : reject(new Error("toBlob failed")), "image/jpeg", quality);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

// 원본 내용의 SHA-256 해시(16진). 같은 사진이면 같은 값 → 중복 판별용
async function hashFile(file){
  if(!crypto.subtle) return null;   // 보안 컨텍스트(HTTPS)에서만 사용 가능
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function handlePhotoUpload(files){
  const nick = getNick();
  if(!nick){ alert("닉네임 설정이 필요해! 💋"); return; }
  if(!sb){ alert("Supabase 설정이 필요해요 ⚙️"); return; }
  const validFiles = Array.from(files).filter(f=>{
    if(f.size > MAX_PHOTO_SIZE){ alert(`${f.name}은 20MB를 초과해서 건너뜰게요 🥲`); return false; }
    return true;
  });
  if(!validFiles.length) return;

  const progress = document.getElementById("photoUploadProgress");
  const bar = document.getElementById("photoProgressBar");
  const text = document.getElementById("photoProgressText");
  progress.style.display = "flex";
  let done = 0;

  let skipped = 0;
  for(const file of validFiles){
    text.textContent = `${file.name} 처리 중... (${done+1}/${validFiles.length})`;
    bar.style.width = `${Math.round(done/validFiles.length*100)}%`;

    // 원본 내용 해시를 경로로 사용 → 같은 사진이면 같은 경로 = 중복 차단
    const hash = await hashFile(file);

    // 압축(2048px / 품질 0.9). 실패하면 원본 그대로 업로드
    let blob = file, name = file.name, ctype = file.type;
    try {
      blob = await compressImage(file, 2048, 0.9);
      name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      ctype = "image/jpeg";
    } catch(e){ console.error("압축 실패, 원본 업로드:", e); }

    const ext = name.split(".").pop().toLowerCase();
    const path = `${hash || crypto.randomUUID()}.${ext}`;

    const {error:stErr} = await sb.storage.from("photos").upload(path, blob, {
      cacheControl:"3600", upsert:false, contentType:ctype
    });
    if(stErr){
      // 이미 같은 사진이 올라와 있으면(경로 중복) 조용히 건너뜀
      if(stErr.statusCode==="409" || stErr.statusCode===409 || stErr.status===409 || /exist|duplicate/i.test(stErr.message||"")){
        skipped++; continue;
      }
      console.error(stErr); alert(`${file.name} 업로드 실패 🥲`); continue;
    }

    const {error:dbErr} = await sb.from("photo_dump").insert({nickname:nick, file_path:path, file_name:name});
    if(dbErr) console.error(dbErr);
    done++;
  }

  bar.style.width = "100%";
  text.textContent = skipped>0 ? `${done}개 완료! (중복 ${skipped}개 건너뜀) 💖` : `${done}개 완료! 💖`;
  setTimeout(()=>{ progress.style.display="none"; bar.style.width="0%"; }, 2000);
  document.getElementById("photoFileInput").value = "";
}

async function downloadPhoto(filePath, fileName){
  if(!sb) return;
  const {data,error} = await sb.storage.from("photos").download(filePath);
  if(error||!data){ alert("다운로드 실패 🥲"); return; }
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

// 사진 모두 저장: 모바일은 공유 시트로 앨범에 저장, 데스크톱은 ZIP 다운로드
let _photosForSave = null;   // 1차 탭에서 받아둔 사진(2차 탭에서 공유)

async function downloadAllPhotos(){
  if(!sb) return;
  const btn = document.getElementById("downloadAllBtn");
  const setBtn = (txt, dis)=>{ if(btn){ btn.disabled = dis; btn.innerHTML = txt; } };
  const resetBtn = ()=> setBtn('<span class="msym" style="font-size:14px">download</span> 사진 모두 저장 💾', false);

  // 2단계: 받아둔 사진이 있으면 '이 탭'(유효한 사용자 제스처)으로 바로 공유 → 앨범 저장
  if(_photosForSave){
    const files = _photosForSave;
    _photosForSave = null;
    try {
      await navigator.share({ files, title:"수아 파티 사진 📸" });
    } catch(e){
      if(e.name !== "AbortError"){ console.error("공유 실패, ZIP으로 대체:", e); await zipDownload(files); }
    }
    resetBtn();
    return;
  }

  // 1단계: 모든 사진을 File 객체로 내려받기
  const {data,error} = await sb.from("photo_dump").select("*").order("created_at",{ascending:true});
  if(error||!data||!data.length){ alert("저장할 사진이 없어요 🥲"); return; }
  const files = [];
  for(let i=0;i<data.length;i++){
    setBtn(`불러오는 중... (${i+1}/${data.length})`, true);
    const {data:blob,error:dErr} = await sb.storage.from("photos").download(data[i].file_path);
    if(dErr||!blob){ console.error(dErr); continue; }
    const name = `sua_${String(i+1).padStart(3,"0")}_${data[i].file_name}`;
    files.push(new File([blob], name, {type:blob.type||"image/jpeg"}));
  }
  if(!files.length){ alert("저장 실패 🥲"); resetBtn(); return; }

  // 공유 지원(주로 모바일): 다운로드 중 사용자 제스처가 만료되므로, 한 번 더
  // 탭하게 해서 '그 탭'으로 공유 시트를 띄운다(앨범에 한 번에 저장 가능)
  if(navigator.canShare && navigator.canShare({files})){
    _photosForSave = files;
    setBtn("📲 한 번 더 눌러 앨범에 저장!", false);
    return;
  }

  // 데스크톱 등: 바로 ZIP 다운로드
  setBtn("ZIP 만드는 중... 💾", true);
  await zipDownload(files);
  resetBtn();
}

async function zipDownload(files){
  try {
    const zip = new JSZip();
    files.forEach(f=> zip.file(f.name, f));
    const zipBlob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sua_party_photos_${new Date().toISOString().slice(0,10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e){
    console.error(e); alert("저장 실패 🥲");
  }
}

function openPhotoLightbox(url){
  const overlay = document.createElement("div");
  overlay.className = "photo-lightbox";
  const img = document.createElement("img");
  img.src = url;
  overlay.appendChild(img);
  overlay.onclick = ()=> document.body.removeChild(overlay);
  document.body.appendChild(overlay);
}

document.addEventListener("DOMContentLoaded", ()=>{
  const zone = document.getElementById("photoDropZone");
  if(!zone) return;
  zone.addEventListener("dragover", e=>{ e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", ()=> zone.classList.remove("drag-over"));
  zone.addEventListener("drop", e=>{
    e.preventDefault();
    zone.classList.remove("drag-over");
    if(e.dataTransfer.files.length) handlePhotoUpload(e.dataTransfer.files);
  });
});

// ── 유틸 ──────────────────────────────────────────
function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function escAttr(s){ return esc(s); }
