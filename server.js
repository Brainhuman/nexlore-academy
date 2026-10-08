const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_BEFORE_PRODUCTION';
const SITE_URL = process.env.SITE_URL || '';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false });

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const clean = v => typeof v === 'string' ? v.trim() : '';
const validMobile = v => /^\+?[0-9۰-۹\s-]{8,20}$/.test(v);
const q = async (text, params=[]) => pool.query(text, params);

async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Use a managed PostgreSQL database in production.');
  }
  await q(`CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY, full_name TEXT NOT NULL, mobile TEXT UNIQUE NOT NULL,
    email TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
    active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, language TEXT NOT NULL, level TEXT,
    description TEXT, sessions INTEGER NOT NULL DEFAULT 12, price BIGINT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS teachers (
    id BIGSERIAL PRIMARY KEY, full_name TEXT NOT NULL, specialty TEXT, bio TEXT,
    mobile TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS registrations (
    id BIGSERIAL PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
    language TEXT NOT NULL, goal TEXT, level TEXT, user_id BIGINT REFERENCES users(id),
    course_id BIGINT REFERENCES courses(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS support_requests (
    id BIGSERIAL PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT NOT NULL, language TEXT,
    subject TEXT, message TEXT, status TEXT NOT NULL DEFAULT 'new', notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), contacted_at TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id BIGINT REFERENCES courses(id), teacher_id BIGINT REFERENCES teachers(id),
    sessions_total INTEGER NOT NULL DEFAULT 12, sessions_used INTEGER NOT NULL DEFAULT 0,
    progress INTEGER NOT NULL DEFAULT 0, last_test INTEGER, next_class TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), amount BIGINT NOT NULL,
    description TEXT, status TEXT NOT NULL DEFAULT 'pending', authority TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  const adminMobile = clean(process.env.ADMIN_MOBILE);
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminMobile && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await q(`INSERT INTO users(full_name,mobile,password_hash,role) VALUES($1,$2,$3,'admin')
      ON CONFLICT(mobile) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', active=TRUE`, ['Nexlore Admin', adminMobile, hash]);
  }
}

function auth(req, res, next) {
  const token = req.cookies?.nexlore;
  if (!token) return res.status(401).json({ok:false,message:'ورود لازم است.'});
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ok:false,message:'نشست شما منقضی شده است.'}); }
}
function admin(req,res,next){ if(req.user?.role !== 'admin') return res.status(403).json({ok:false,message:'دسترسی مدیر لازم است.'}); next(); }

app.get('/api/contact',(req,res)=>res.json({phones:['09965656792','09193457814'],email:'asenaahadi0@gmail.com',siteUrl:SITE_URL}));
app.get('/api/courses',async(req,res)=>{const r=await q('SELECT * FROM courses WHERE active=TRUE ORDER BY id DESC');res.json({ok:true,courses:r.rows});});

app.post('/api/register',async(req,res)=>{
  try {
    const full_name=clean(req.body.full_name), phone=clean(req.body.phone), email=clean(req.body.email), language=clean(req.body.language), goal=clean(req.body.goal), level=clean(req.body.level), password=clean(req.body.password);
    if(!full_name||!phone||!language||!password) return res.status(400).json({ok:false,message:'نام، موبایل، زبان و رمز عبور الزامی است.'});
    if(!validMobile(phone)) return res.status(400).json({ok:false,message:'شماره موبایل معتبر نیست.'});
    const hash=await bcrypt.hash(password,12);
    const u=await q(`INSERT INTO users(full_name,mobile,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id`,[full_name,phone,email||null,hash]);
    await q(`INSERT INTO registrations(full_name,phone,email,language,goal,level,user_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,[full_name,phone,email||null,language,goal,level,u.rows[0].id]);
    const token=jwt.sign({id:u.rows[0].id,role:'student',mobile:phone},JWT_SECRET,{expiresIn:'7d'});
    res.cookie('nexlore',token,{httpOnly:true,secure:!!process.env.SITE_URL,sameSite:'lax',maxAge:7*86400000});
    res.status(201).json({ok:true,message:'ثبت‌نام با موفقیت انجام شد.',redirect:'/dashboard.html'});
  } catch(e){ if(e.code==='23505') return res.status(409).json({ok:false,message:'این شماره موبایل قبلاً ثبت شده است.'}); console.error(e); res.status(500).json({ok:false,message:'خطای سرور'}); }
});

app.post('/api/login',async(req,res)=>{try{const mobile=clean(req.body.mobile),password=clean(req.body.password);const r=await q('SELECT * FROM users WHERE mobile=$1 AND active=TRUE',[mobile]);if(!r.rows[0]||!(await bcrypt.compare(password,r.rows[0].password_hash)))return res.status(401).json({ok:false,message:'شماره موبایل یا رمز عبور اشتباه است.'});const u=r.rows[0];const token=jwt.sign({id:u.id,role:u.role,mobile:u.mobile},JWT_SECRET,{expiresIn:u.role==='admin'?'12h':'7d'});res.cookie('nexlore',token,{httpOnly:true,secure:!!process.env.SITE_URL,sameSite:'lax',maxAge:(u.role==='admin'?12:168)*3600000});res.json({ok:true,role:u.role,redirect:u.role==='admin'?'/admin.html':'/dashboard.html'});}catch(e){console.error(e);res.status(500).json({ok:false,message:'خطای سرور'});}});
app.post('/api/logout',(req,res)=>{res.clearCookie('nexlore');res.json({ok:true});});
app.get('/api/me',auth,async(req,res)=>{const r=await q('SELECT id,full_name,mobile,email,role FROM users WHERE id=$1',[req.user.id]);res.json({ok:true,user:r.rows[0]});});

app.post('/api/support',async(req,res)=>{try{const full_name=clean(req.body.full_name),phone=clean(req.body.phone),language=clean(req.body.language),subject=clean(req.body.subject),message=clean(req.body.message);if(!full_name||!phone)return res.status(400).json({ok:false,message:'نام و شماره تماس الزامی است.'});const r=await q(`INSERT INTO support_requests(full_name,phone,language,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING id`,[full_name,phone,language,subject,message]);res.status(201).json({ok:true,id:r.rows[0].id,message:'درخواست تماس شما ثبت شد. کارشناسان Nexlore با شما تماس می‌گیرند.'});}catch(e){console.error(e);res.status(500).json({ok:false,message:'خطای سرور'});}});

app.get('/api/dashboard',auth,async(req,res)=>{const u=(await q('SELECT id,full_name,mobile,email FROM users WHERE id=$1',[req.user.id])).rows[0];const e=(await q(`SELECT e.*,c.name course_name,c.language,t.full_name teacher_name FROM enrollments e LEFT JOIN courses c ON c.id=e.course_id LEFT JOIN teachers t ON t.id=e.teacher_id WHERE e.user_id=$1 ORDER BY e.id DESC LIMIT 1`,[req.user.id])).rows[0]||null;res.json({ok:true,user:u,enrollment:e});});

app.post('/api/payment/create',auth,async(req,res)=>{const amount=Number(req.body.amount),description=clean(req.body.description);if(!amount||amount<1000)return res.status(400).json({ok:false,message:'مبلغ نامعتبر است.'});const r=await q(`INSERT INTO payments(user_id,amount,description) VALUES($1,$2,$3) RETURNING id`,[req.user.id,amount,description]);res.json({ok:true,paymentId:r.rows[0].id,status:'pending',message:'درگاه پرداخت آماده اتصال است.'});});

app.get('/api/admin/overview',auth,admin,async(req,res)=>{const [u,c,t,r,s,p]=await Promise.all([q("SELECT COUNT(*)::int n FROM users WHERE role='student'"),q('SELECT COUNT(*)::int n FROM courses WHERE active=TRUE'),q('SELECT COUNT(*)::int n FROM teachers WHERE active=TRUE'),q('SELECT COUNT(*)::int n FROM registrations'),q("SELECT COUNT(*)::int n FROM support_requests WHERE status='new'"),q("SELECT COUNT(*)::int n FROM payments WHERE status='paid'")]);res.json({ok:true,stats:{students:u.rows[0].n,courses:c.rows[0].n,teachers:t.rows[0].n,registrations:r.rows[0].n,newSupport:s.rows[0].n,paid:p.rows[0].n}});});
app.get('/api/admin/registrations',auth,admin,async(req,res)=>res.json({ok:true,registrations:(await q('SELECT * FROM registrations ORDER BY id DESC')).rows}));
app.get('/api/admin/support',auth,admin,async(req,res)=>res.json({ok:true,requests:(await q('SELECT * FROM support_requests ORDER BY id DESC')).rows}));
app.patch('/api/admin/support/:id',auth,admin,async(req,res)=>{const status=clean(req.body.status)||'new',notes=clean(req.body.notes);await q('UPDATE support_requests SET status=$1,notes=$2,contacted_at=CASE WHEN $1 IN (\'contacted\',\'complete\') THEN COALESCE(contacted_at,NOW()) ELSE contacted_at END WHERE id=$3',[status,notes,req.params.id]);res.json({ok:true});});
app.get('/api/admin/students',auth,admin,async(req,res)=>res.json({ok:true,students:(await q("SELECT id,full_name,mobile,email,active,created_at FROM users WHERE role='student' ORDER BY id DESC")).rows}));
app.get('/api/admin/teachers',auth,admin,async(req,res)=>res.json({ok:true,teachers:(await q('SELECT * FROM teachers ORDER BY id DESC')).rows}));
app.post('/api/admin/teachers',auth,admin,async(req,res)=>{const full_name=clean(req.body.full_name);if(!full_name)return res.status(400).json({ok:false,message:'نام مدرس الزامی است.'});const r=await q('INSERT INTO teachers(full_name,specialty,bio,mobile) VALUES($1,$2,$3,$4) RETURNING *',[full_name,clean(req.body.specialty),clean(req.body.bio),clean(req.body.mobile)]);res.status(201).json({ok:true,teacher:r.rows[0]});});
app.delete('/api/admin/teachers/:id',auth,admin,async(req,res)=>{await q('UPDATE teachers SET active=FALSE WHERE id=$1',[req.params.id]);res.json({ok:true});});
app.get('/api/admin/courses',auth,admin,async(req,res)=>res.json({ok:true,courses:(await q('SELECT * FROM courses ORDER BY id DESC')).rows}));
app.post('/api/admin/courses',auth,admin,async(req,res)=>{const name=clean(req.body.name),language=clean(req.body.language),sessions=Number(req.body.sessions||12),price=Number(req.body.price||0);if(!name||!language)return res.status(400).json({ok:false,message:'نام دوره و زبان الزامی است.'});const r=await q('INSERT INTO courses(name,language,level,description,sessions,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[name,language,clean(req.body.level),clean(req.body.description),sessions,price]);res.status(201).json({ok:true,course:r.rows[0]});});
app.delete('/api/admin/courses/:id',auth,admin,async(req,res)=>{await q('UPDATE courses SET active=FALSE WHERE id=$1',[req.params.id]);res.json({ok:true});});
app.get('/api/admin/payments',auth,admin,async(req,res)=>res.json({ok:true,payments:(await q(`SELECT p.*,u.full_name,u.mobile FROM payments p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.id DESC`)).rows}));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'Nexlore Academy Backend',database:process.env.DATABASE_URL?'postgresql':'not-configured'}));

app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

initDb().then(()=>app.listen(PORT,()=>console.log(`Nexlore Academy running on port ${PORT}`))).catch(err=>{console.error('Database initialization failed:',err.message);process.exit(1);});
