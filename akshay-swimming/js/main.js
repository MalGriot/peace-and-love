/* ============================================================
   AKSHAY SWIMMING ACADEMY - shared interactions
   ============================================================ */

// ---- nav scroll state ----
(function(){
  var nav = document.querySelector('.nav');
  if(!nav) return;
  function onScroll(){
    if(window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });
})();

// ---- scroll reveal ----
(function(){
  var els = document.querySelectorAll('.fade-up');
  if(!els.length) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold:.15 });
  els.forEach(function(el){ io.observe(el); });
})();

// ---- FAQ accordion ----
(function(){
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      items.forEach(function(other){
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });
})();

// ---- hero water ripple canvas (subtle, calm - not decorative overkill) ----
(function(){
  var canvas = document.querySelector('.hero-canvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var w, h, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var lines = [];
  var lineCount = 7;

  function resize(){
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function buildLines(){
    lines = [];
    for(var i=0;i<lineCount;i++){
      lines.push({
        y: (h/ (lineCount+1)) * (i+1),
        amp: 14 + Math.random()*18,
        len: 260 + Math.random()*260,
        speed: 0.15 + Math.random()*0.25,
        offset: Math.random()*1000,
        opacity: 0.05 + Math.random()*0.08
      });
    }
  }
  function draw(t){
    ctx.clearRect(0,0,w,h);
    lines.forEach(function(l){
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(224,181,127,' + l.opacity + ')';
      ctx.lineWidth = 1;
      for(var x=-40;x<=w+40;x+=6){
        var y = l.y + Math.sin((x*0.01) + t*l.speed*0.001 + l.offset) * l.amp * Math.sin(x/l.len);
        if(x===-40) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    });
    requestAnimationFrame(draw);
  }
  resize(); buildLines();
  window.addEventListener('resize', function(){ resize(); buildLines(); });
  requestAnimationFrame(draw);
})();

// ---- starting-point cards route to program pages ----
(function(){
  document.querySelectorAll('[data-route]').forEach(function(card){
    card.addEventListener('click', function(){
      window.location.href = card.getAttribute('data-route');
    });
  });
})();

// ============================================================
// BOOKING ENGINE - shared state across book.html steps
// This is a client-side mock. All payment/booking calls are
// isolated behind BookingAPI so a real provider (Razorpay etc.)
// and a real backend can be dropped in later.
// ============================================================
window.BookingAPI = {
  // MOCK - replace with real backend calls.
  createReservation: function(payload){
    return new Promise(function(resolve){
      setTimeout(function(){
        resolve({
          ok:true,
          bookingId: 'ASA-' + Math.floor(100000 + Math.random()*899999),
          payload: payload
        });
      }, 700);
    });
  },
  charge: function(bookingId, amount){
    // MOCK payment - no real payment provider connected yet.
    return new Promise(function(resolve){
      setTimeout(function(){ resolve({ ok:true, bookingId:bookingId, amount:amount }); }, 900);
    });
  }
};

window.BookingStore = {
  KEY: 'asa_booking_v1',
  get: function(){
    try{ return JSON.parse(sessionStorage.getItem(this.KEY)) || {}; }
    catch(e){ return {}; }
  },
  set: function(data){
    sessionStorage.setItem(this.KEY, JSON.stringify(Object.assign(this.get(), data)));
  },
  clear: function(){ sessionStorage.removeItem(this.KEY); }
};
