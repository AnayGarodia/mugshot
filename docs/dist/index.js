// mugshot — deterministic hand-drawn doodle face avatars.
// face(seed) -> SVG string. Same seed, same face, always.
import { FEM_TABLE, MASC_TABLE, GRAMS, GRAM_WEIGHTS, GENDER_PRIOR, GENDER_SCALE } from "./gender-data.js";
// ---------- seeded randomness ----------
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
function mulberry32(a) {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// Independent sub-stream per feature: tweaking one feature's draws
// never reshuffles the others.
function stream(seed, feature) {
    return mulberry32(xmur3(seed + ":" + feature)());
}
/** Deterministic per-seed random stream, for building on top of mugshot. */
export function seededRng(seed, tag = "") {
    return stream(seed, tag);
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const rand = (r, a, b) => a + r() * (b - a);
const chance = (r, p) => r() < p;
// ---------- ink primitives ----------
// Jitter points, then Catmull-Rom -> cubic bezier for a smooth wobbly line.
function inkPath(r, pts, opts = {}) {
    const wob = opts.wobble ?? 1.1;
    const j = pts.map(([x, y]) => [x + rand(r, -wob, wob), y + rand(r, -wob, wob)]);
    if (j.length === 2) {
        return `M${j[0][0].toFixed(1)} ${j[0][1].toFixed(1)} L${j[1][0].toFixed(1)} ${j[1][1].toFixed(1)}`;
    }
    const p = opts.close ? [j[j.length - 1], ...j, j[0], j[1]] : [j[0], ...j, j[j.length - 1]];
    let d = `M${p[1][0].toFixed(1)} ${p[1][1].toFixed(1)}`;
    for (let i = 1; i < p.length - 2; i++) {
        const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    if (opts.close)
        d += " Z";
    return d;
}
function line(r, a, b, wobble = 0.8) {
    const mid = [(a[0] + b[0]) / 2 + rand(r, -1, 1), (a[1] + b[1]) / 2 + rand(r, -1, 1)];
    return inkPath(r, [a, mid, b], { wobble });
}
function circlePts(cx, cy, r, n = 8) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
}
// ---------- palette ----------
// Common feminine given names (lowercase). Used only to pick a presentation
// style when the seed looks like a name; override with options.style.
const FEM = new Set(("ada,grace,barbara,margaret,radia,ana,anna,anne,annie,amy,alice,amelia,abigail,aisha,akari,amara,angela,anita,april,aria,ariana,ashley,astrid,aurora,ava,beatrice,bella,beth,betty,bianca,brenda,briana,bridget,camila,carla,carmen,carol,caroline,carrie,cassandra,catherine,cecilia,celia,chandra,chloe,christina,claire,clara,claudia,cora,daisy,dana,daniela,daphne,deborah,denise,diana,dina,dolores,donna,dora,dorothy,eleanor,elena,eliza,elizabeth,ella,ellen,elsa,emily,emma,erica,esther,eva,evelyn,fatima,fiona,flora,frances,freya,gabriela,gina,giulia,gloria,greta,gwen,hannah,harriet,hazel,heather,heidi,helen,helena,ida,ines,ingrid,irene,iris,isabel,isabella,ivy,jackie,jane,janet,jasmine,jennifer,jessica,jill,joan,joanna,josephine,joy,judith,julia,julie,june,karen,kate,katherine,kathleen,katya,kayla,keiko,kira,kristen,laila,lara,laura,lauren,layla,leah,leila,lena,lila,lily,linda,lisa,livia,lois,lola,lucia,lucy,luna,lydia,mabel,madison,maggie,maki,mara,maria,marie,marina,marta,martha,mary,matilda,maya,megan,mei,melissa,mia,michelle,mina,miriam,molly,monica,nadia,nancy,naomi,natalia,natalie,nia,nicole,nina,noor,nora,olga,olivia,paige,pam,patricia,paula,pearl,penny,phoebe,priya,rachel,rebecca,regina,renee,rita,rosa,rose,ruby,ruth,sadie,sakura,sally,samantha,sandra,sara,sarah,selena,sharon,sheila,shirley,silvia,simone,sofia,sophia,sophie,stella,susan,tanya,tara,teresa,tessa,tina,uma,valentina,valerie,vera,veronica,victoria,violet,wendy,willow,xena,yara,yasmin,yuki,yukiko,zara,zoe,zoya,prisha,ananya,aanya,anya,diya,riya,siya,jiya,mahi,kiara,myra,aadhya,aaradhya,avni,ishita,khushi,kavya,navya,pari,shreya,sneha,pooja,neha,meera,mira,radha,sita,gita,geeta,lakshmi,saanvi,anika,tanvi,kritika,nisha,isha,esha,asha,usha,rekha,sunita,divya,swati,jyoti,poonam,ritu,seema,shweta,vandana,deepika,aishwarya,aakriti,kriti,smriti,aditi,maitree,aarti,bharti,kirti,gauri,saloni,simran,muskan,anjali,roshni,damini,yamini,shalini,nandini,ragini,hema,lata,asmita,amrita,ankita,babita,kavita,lalita,mamta,namita,sarita,savita,vinita,ridhi,siddhi,nidhi,khyati,stuti,drishti,srishti,shruti,swara,veda,prerna,priyanka,deepti,dipti,preeti,priti,trupti,tripti,bhavna,archana,rachna,sapna,shobha,megha,manisha,tanisha,harshita,ishani,bhavya,charvi,dhriti,inaaya,zainab,fatimah,ayesha,sana,hina,rabia,mariam,maryam,amina,thandiwe,nomvula,zanele,lindiwe,ntombi,thembi,nosipho,aminata,fatoumata,mariama,khadija,hawa,ngozi,adaeze,chidinma,nneka,folake,yetunde,funmilayo,akosua,ama,efua,esi,abena,adwoa,afia,juhi,payal,komal,sonam,sonali,rani,rashmi,vidya,madhuri").split(","));
const MASC = new Set(("joshua,luca,ezra,mustafa,abdulla,krishna,ira,nikita,kanha,mishka,aaron,adam,ahmed,alan,albert,alex,alexander,ali,andre,andrew,andy,anthony,antonio,arthur,austin,ben,benjamin,bernard,bill,bob,brad,brandon,brendan,brian,bruce,bruno,caleb,calvin,carl,carlos,charles,charlie,chris,christian,christopher,colin,connor,craig,dan,daniel,dave,david,dennis,derek,diego,dmitri,dominic,donald,douglas,duncan,dylan,eddie,edgar,edsger,eduardo,edward,eli,elliot,emil,eric,erik,ethan,evan,felix,fernando,francis,frank,fred,gabriel,gary,george,gordon,graham,grant,greg,guido,gustav,harold,harry,hassan,hector,henry,hugo,ian,ibrahim,igor,isaac,ivan,jack,jacob,jake,james,jason,javier,jeff,jeremy,jesse,jim,joe,joel,john,jonathan,jordan,jorge,jose,joseph,josh,juan,julian,justin,karl,keith,ken,kenneth,kevin,kyle,lars,laurence,lee,leo,leon,leonard,levi,liam,linus,louis,lucas,luis,luke,marc,marco,marcus,mario,mark,martin,matt,matthew,max,michael,miguel,mike,nathan,neil,nick,nicolas,noah,oliver,omar,oscar,owen,pablo,patrick,paul,pedro,peter,phil,philip,pierre,quentin,rafael,ralph,raymond,ricardo,richard,rob,robert,roberto,rodrigo,roger,roman,ron,ross,roy,ryan,sam,samuel,scott,sean,sergei,seth,shane,simon,stefan,stephen,steve,steven,stuart,ted,theo,thomas,tim,timothy,toby,tom,tony,travis,trevor,tyler,victor,vincent,vlad,walter,warren,wayne,will,william,xavier,zach,anay,narendra,devendra,jitendra,mahendra,rajendra,surendra,virendra,ravindra,aditya,rahul,rohan,arjun,vikram,sanjay,rajesh,suresh,ramesh,mahesh,ganesh,amit,anil,ravi,raj,dev,dhruv,karan,mohan,gopal,vijay,ajay,deepak,manoj,nitin,pankaj,prakash,pradeep,sunil,vinod,ashok,arun,varun,kunal,kartik,karthik,nikhil,siddharth,aryan,vivaan,reyansh,ishaan,shivam,harsh,yash,atharv,kabir,ayaan,hardik,jay,parth,prakarsh,utkarsh,adarsh,sparsh,saksham,shubham,satyam,shivam,shivansh,devansh,shreyansh,priyansh,lakshya,daksh,rudransh,vedant,jayant,hemant,nishant,prashant,sushant,vikrant,srikanth,venkatesh,ritesh,hitesh,mitesh,jignesh,bhavesh,naresh,dinesh,umesh,yogesh,mukesh,rakesh,lokesh,kamlesh,brijesh,rohit,mohit,ankit,ankur,gaurav,saurabh,vaibhav,abhishek,akshay,ajit,sumit,amit,arnav,madhav,raghav,keshav,tanmay,chinmay,abhay,akash,vikas,manan,naman,aman,armaan,irfan,imran,salman,farhan,rehan,zaid,hamza,bilal,tariq,usman,pranav,rudra,ved,vihaan,advait,shlok,tejas,modi,emeka,chinedu,ikechukwu,obinna,nnamdi,chukwuemeka,oluwasegun,babatunde,olusegun,adebayo,kofi,kojo,kwesi,yaw,sekou,mamadou,ousmane,ibrahima,cheikh,abdoulaye,moussa,amadou,sipho,thabo,bongani,mandla,siyabonga,chen,wei,jun,kenji,hiroshi,takeshi,haruto,ren,sota,minjun,jihoon,seojun,duc,minh,quan,anders,bjarne,dennis,linus,brendan,rasmus,ryan,yukihiro,rich,jose,graydon").split(","));
let femTable = null;
let mascTable = null;
let gramW = null;
function initGender() {
    femTable = new Set(FEM_TABLE.split(","));
    mascTable = new Set(MASC_TABLE.split(","));
    gramW = new Map();
    for (let i = 0; i * 4 < GRAMS.length; i++) {
        const g = GRAMS.slice(i * 4, i * 4 + 4).replace(/\|+$/, "");
        gramW.set(g, (atob_(GRAM_WEIGHTS)[i] - 128) / GENDER_SCALE);
    }
}
// base64 -> byte array without depending on Buffer/atob availability
let b64cache = null;
function atob_(s) {
    if (b64cache)
        return b64cache;
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const out = [];
    let buf = 0, bits = 0;
    for (const ch of s) {
        const v = A.indexOf(ch);
        if (v < 0)
            continue;
        buf = (buf << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push((buf >> bits) & 0xff);
        }
    }
    return (b64cache = out);
}
// Curated overrides win, then the exact table of ~3500 common names
// (global usage data + Indian public records), then a character n-gram
// model trained on ~38k labeled names. Non-name seeds get a seeded mix.
function looksFem(seed, r) {
    const name = seed.toLowerCase().split(/[@._\-\s\d+]+/)[0] || "";
    if (FEM.has(name))
        return true;
    if (MASC.has(name))
        return false;
    if (name.length < 3 || !/^[a-z]+$/.test(name))
        return chance(r, 0.22);
    if (!femTable)
        initGender();
    if (femTable.has(name))
        return true;
    if (mascTable.has(name))
        return false;
    const s2 = "^" + name + "$";
    let score = GENDER_PRIOR;
    for (const L of [2, 3, 4]) {
        for (let i = 0; i + L <= s2.length; i++) {
            score += gramW.get(s2.slice(i, i + L)) ?? 0;
        }
    }
    return score > 0;
}
const INKS = ["#1c1b1a", "#1c1b1a", "#1c1b1a", "#1c1b1a", "#2b3a67", "#4a3426", "#2f4a3c"];
const ACCENTS = ["#b5563f", "#3f5d9e", "#6f8f6a", "#c98a2d", "#8a5a83"];
const BLUSH = "#d98973";
export function face(seed, options = {}) {
    return build(seed, options).svg;
}
// Everything a component needs to animate a face: eye geometry + tagged pupil group.
export function faceParts(seed, options = {}) {
    return build(seed, options);
}
function build(seed, options = {}) {
    const size = options.size ?? 120;
    const colorOn = options.color !== false && !options.ink;
    const rpal = stream(seed, "palette");
    const ink = options.ink ?? (colorOn ? pick(rpal, INKS) : "#1c1b1a");
    const accent = colorOn ? pick(rpal, ACCENTS) : ink;
    const mood = options.mood ?? "auto";
    const fem = options.style === "fem" ? true : options.style === "masc" ? false : looksFem(seed, stream(seed, "style"));
    const bg = options.background ?? "transparent";
    const out = [];
    const dots = [];
    const pupils = [];
    // --- head ---
    const rh = stream(seed, "head");
    const hw = rand(rh, 21, 36); // half width
    const hh = rand(rh, 26, 42); // half height
    const cx = 50 + rand(rh, -1.5, 1.5);
    const cy = 54 + rand(rh, -2, 2);
    let jaw = pick(rh, ["round", "round", "square", "pointy", "wide"]);
    if (jaw === "pointy" && hw < 27)
        jaw = "round";
    const headPts = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        let rx = hw;
        const s = Math.sin(a);
        if (jaw === "square" && s > 0.3) {
            rx *= 1.08;
        }
        if (jaw === "pointy" && s > 0.3) {
            rx *= 1 - (s - 0.3) * 0.22;
        }
        if (jaw === "wide" && Math.abs(s) < 0.5) {
            rx *= 1.1;
        }
        const wobR = 1 + rand(rh, -0.05, 0.05);
        headPts.push([cx + Math.cos(a) * rx * wobR, cy + s * hh * wobR]);
    }
    out.push({ d: inkPath(rh, headPts, { close: true, wobble: 1.4 }), fill: options.paper });
    const edgeX = (y) => hw * Math.sqrt(Math.max(0, 1 - ((y - cy) / hh) ** 2));
    // --- pose ---
    const rp = stream(seed, "pose");
    const turn = chance(rp, 0.55) ? 0 : rand(rp, -1, 1) * pick(rp, [0.4, 0.7]);
    const xf = cx + turn * hw * 0.28;
    // --- mood -> expression controls ---
    const rmood = stream(seed, "mood");
    const autoMood = pick(rmood, ["calm", "calm", "happy", "happy", "grumpy", "sleepy", "surprised", "wink"]);
    const m = mood === "auto" ? autoMood : mood;
    // --- hair kind decided early: long styles cover the ears ---
    const rha = stream(seed, "hair");
    const hairKind = fem
        ? pick(rha, ["long", "long", "long", "bob", "bob", "bun", "pony", "curls"])
        : pick(rha, ["solid", "solid", "hatch", "spiky", "curls", "cap", "bald", "wisps"]);
    const coversEars = hairKind === "long" || hairKind === "bob";
    // --- ears ---
    const re2 = stream(seed, "ears");
    const hasEars = !coversEars && chance(re2, fem ? 0.4 : 0.55);
    const earY = cy + rand(re2, -4, 2);
    if (hasEars) {
        for (const s of [-1, 1]) {
            if (turn * s > 0.5)
                continue;
            const jawW = (jaw === "wide" && Math.abs((earY - cy) / hh) < 0.5) ? 1.1 : jaw === "square" ? 1.04 : 1;
            const ex0 = cx + s * edgeX(earY) * jawW;
            out.push({ d: inkPath(re2, [[ex0, earY - 4], [ex0 + s * 3.5, earY], [ex0, earY + 4]], { wobble: 0.8 }) });
        }
    }
    // --- eyes ---
    const re = stream(seed, "eyes");
    const ey = cy - hh * rand(re, 0.08, 0.22);
    const gap = hw * rand(re, 0.36, 0.5);
    const lx = xf - gap * (1 + turn * 0.25);
    const rx2 = xf + gap * (1 - turn * 0.25);
    const hasGlasses = chance(stream(seed, "glasses"), 0.16);
    const seedEye = pick(re, ["dot", "dot", "dot", "ring", "dot", "dot"]);
    const kind = m === "sleepy" ? "sleepy" :
        m === "surprised" ? "ring" :
            m === "wink" ? "wink" :
                hasGlasses ? "dot" : seedEye;
    const rEye = rand(re, 1.4, 3.0) * (m === "surprised" ? 1.25 : 1);
    const drawEye = (x, winkThis) => {
        if (kind === "wink" && winkThis) {
            out.push({ d: line(re, [x - 2.5, ey], [x + 2.5, ey + rand(re, -1, 1)]), width: 1.3 });
        }
        else if (kind === "ring") {
            out.push({ d: inkPath(re, circlePts(x, ey, rEye + 1.4), { close: true, wobble: 0.5 }), width: 1.2 });
            pupils.push(`<circle cx="${x.toFixed(1)}" cy="${ey.toFixed(1)}" r="0.9"/>`);
        }
        else if (kind === "sleepy") {
            out.push({ d: inkPath(re, [[x - 2.5, ey], [x, ey + 1.6], [x + 2.5, ey]], { wobble: 0.5 }), width: 1.3 });
        }
        else {
            pupils.push(`<circle cx="${x.toFixed(1)}" cy="${(ey + rand(re, -0.8, 0.8)).toFixed(1)}" r="${(rEye + rand(re, -0.2, 0.2)).toFixed(1)}"/>`);
        }
    };
    const winkSide = chance(re, 0.5);
    drawEye(lx, winkSide);
    drawEye(rx2, !winkSide);
    if (fem) {
        for (const [x, sgn] of [[lx, -1], [rx2, 1]]) {
            const bx = x + sgn * (rEye + 1.6);
            for (let i = 0; i < 2; i++) {
                out.push({ d: line(re, [bx + sgn * i * 1.4, ey - 0.5 + i * 1.1], [bx + sgn * (2.2 + i * 1.6), ey - 2.2 + i * 0.9], 0.3), width: 1 });
            }
        }
    }
    // glasses
    const rg = stream(seed, "glasses");
    if (chance(rg, 0.16)) { // same first draw as hasGlasses above
        const gr = gap * rand(rg, 0.55, 0.85);
        const shape = pick(rg, ["round", "square"]);
        const gInk = colorOn && chance(rg, 0.3) ? accent : ink;
        for (const x of [lx, rx2]) {
            out.push({
                d: shape === "round"
                    ? inkPath(rg, circlePts(x, ey, gr), { close: true, wobble: 0.7 })
                    : inkPath(rg, [[x - gr, ey - gr * 0.8], [x + gr, ey - gr * 0.8], [x + gr, ey + gr * 0.8], [x - gr, ey + gr * 0.8]], { close: true, wobble: 0.7 }),
                width: 1.2, stroke: gInk,
            });
        }
        out.push({ d: line(rg, [lx + gr, ey], [rx2 - gr, ey]), width: 1.2, stroke: gInk });
        out.push({ d: line(rg, [lx - gr, ey], [cx - edgeX(ey), ey - 1]), width: 1.0, stroke: gInk });
        out.push({ d: line(rg, [rx2 + gr, ey], [cx + edgeX(ey), ey - 1]), width: 1.0, stroke: gInk });
    }
    // --- brows ---
    const rb = stream(seed, "brows");
    const browBase = chance(rb, 0.45);
    const showBrows = m === "grumpy" || m === "sad" || m === "surprised" ? true : browBase;
    if (showBrows) {
        const lift = m === "surprised" ? 3.5 : 0;
        const by = ey - rand(rb, 4, 7) - lift;
        const seedTilt = rand(rb, -1.5, 1.5);
        // tilt: + = inner ends down (grumpy), - = inner ends up (sad)
        const tilt = m === "grumpy" ? rand(rb, 1.6, 2.6) : m === "sad" ? rand(rb, -2.4, -1.4) : m === "surprised" ? 0 : seedTilt;
        const bw = rand(rb, 2.5, 4.5);
        const w = m === "grumpy" ? rand(rb, 1.8, 2.6) : rand(rb, 1.2, 2.2);
        const uni = m !== "surprised" && chance(rb, 0.06);
        if (uni) {
            out.push({ d: line(rb, [lx - bw, by], [rx2 + bw, by + rand(rb, -1, 1)], 1), width: 2.4 });
        }
        else {
            out.push({ d: line(rb, [lx - bw, by - tilt], [lx + bw, by + tilt]), width: w });
            out.push({ d: line(rb, [rx2 - bw, by + tilt], [rx2 + bw, by - tilt]), width: w });
        }
    }
    // --- nose ---
    const rn = stream(seed, "nose");
    if (chance(rn, 0.92)) {
        const ny = ey + rand(rn, 3, 5);
        const nl = rand(rn, 5, 14);
        const dir = turn !== 0 ? Math.sign(turn) : (chance(rn, 0.5) ? 1 : -1);
        const nk = pick(rn, ["l", "l", "curve", "long"]);
        if (nk === "l") {
            out.push({ d: inkPath(rn, [[xf + dir * rand(rn, -1, 1), ny], [xf + dir * rand(rn, 0, 2), ny + nl], [xf + dir * rand(rn, 3, 5.5), ny + nl + rand(rn, -1, 1.5)]], { wobble: 0.7 }) });
        }
        else if (nk === "curve") {
            out.push({ d: inkPath(rn, [[xf - dir, ny], [xf + dir * 2.5, ny + nl * 0.6], [xf + dir * 1.5, ny + nl], [xf - dir * 1.5, ny + nl + 1]], { wobble: 0.7 }) });
        }
        else {
            out.push({ d: inkPath(rn, [[xf, ny - 1], [xf + dir * rand(rn, 1, 3), ny + nl + 2], [xf + dir * rand(rn, 2, 4), ny + nl + 3]], { wobble: 0.7 }) });
        }
    }
    // --- cheeks: blush / freckles ---
    const rc = stream(seed, "cheeks");
    const chY = ey + hh * 0.28;
    if (chance(rc, colorOn ? 0.3 : 0.12)) { // blush
        for (const s of [-1, 1]) {
            if (turn * s > 0.5)
                continue;
            const bx = xf + s * gap * 1.15;
            const pts = [];
            for (let i = 0; i < 3; i++)
                pts.push([bx - 3 + rand(rc, -1, 1), chY + i * 1.4], [bx + 3 + rand(rc, -1, 1), chY + i * 1.4 + 0.7]);
            out.push({ d: inkPath(rc, pts, { wobble: 0.5 }), width: 1, stroke: colorOn ? BLUSH : ink, opacity: colorOn ? 0.75 : 0.35 });
        }
    }
    else if (chance(rc, 0.16)) { // freckles
        for (let i = 0; i < Math.floor(rand(rc, 4, 8)); i++) {
            const s = chance(rc, 0.5) ? -1 : 1;
            dots.push(`<circle cx="${(xf + s * rand(rc, 4, gap * 1.2)).toFixed(1)}" cy="${(chY + rand(rc, -2, 3)).toFixed(1)}" r="0.55" opacity="0.6"/>`);
        }
    }
    // --- mouth ---
    const rm = stream(seed, "mouth");
    const my = cy + hh * rand(rm, 0.42, 0.58);
    const mw = rand(rm, 4.5, 9);
    const seedMouth = pick(rm, ["line", "line", "smile", "frown", "o", "smirk"]);
    const mk = m === "happy" ? "smile" :
        m === "sad" || m === "grumpy" ? (chance(rm, 0.4) ? "line" : "frown") :
            m === "surprised" ? "o" :
                m === "wink" ? "smirk" :
                    m === "sleepy" ? (chance(rm, 0.5) ? "line" : "o") :
                        seedMouth;
    const mx = xf + rand(rm, -1, 1);
    if (mk === "o") {
        const orr = m === "surprised" ? rand(rm, 2.4, 3.6) : rand(rm, 1.5, 2.8);
        out.push({ tag: "mouth", d: inkPath(rm, circlePts(mx, my, orr), { close: true, wobble: 0.5 }), width: 1.3 });
    }
    else if (mk === "smirk") {
        out.push({ tag: "mouth", d: inkPath(rm, [[mx - mw, my], [mx + mw * 0.3, my + 1], [mx + mw, my - rand(rm, 1.5, 3)]], { wobble: 0.6 }) });
    }
    else if (mk === "smile" && chance(rm, m === "happy" ? 0.35 : 0.12)) { // toothy grin
        const gw = mw * 1.1, gh = rand(rm, 3, 4.5);
        out.push({ tag: "mouth", d: inkPath(rm, [[mx - gw, my], [mx, my + gh], [mx + gw, my]], { close: true, wobble: 0.7 }), width: 1.2 });
        out.push({ tag: "mouth", d: line(rm, [mx - gw * 0.8, my + gh * 0.45], [mx + gw * 0.8, my + gh * 0.45], 0.4), width: 0.9 });
    }
    else {
        const bend = mk === "smile" ? rand(rm, 2, 4) * (m === "happy" ? 1.3 : 1) :
            mk === "frown" ? rand(rm, -3.5, -1.5) :
                rand(rm, -0.7, 0.7);
        out.push({ tag: "mouth", d: inkPath(rm, [[mx - mw, my], [mx, my + bend], [mx + mw, my + rand(rm, -1, 1)]], { wobble: 0.6 }) });
    }
    // --- facial hair ---
    const rf = stream(seed, "fuzz");
    if (!fem && chance(rf, 0.18)) {
        if (chance(rf, 0.6)) {
            const muY = cy + hh * 0.38;
            out.push({ d: line(rf, [xf - rand(rf, 4, 7), muY], [xf + rand(rf, 4, 7), muY - 0.5], 1), width: rand(rf, 2, 3) });
        }
        else {
            const chinY = cy + hh * 0.86;
            for (let i = 0; i < 5; i++) {
                const sx = xf + rand(rf, -6, 6);
                out.push({ d: line(rf, [sx, chinY + rand(rf, -1, 1)], [sx + rand(rf, -1, 1), chinY + rand(rf, 2.5, 4)], 0.4), width: 1 });
            }
        }
    }
    // --- hair ---
    let hatchClip = "";
    const hatchLines = [];
    const hairInk = colorOn && chance(rha, hairKind === "cap" ? 0.55 : 0.25) ? accent : ink;
    const hairline = cy - hh * rand(rha, 0.22, 0.58);
    if (hairKind === "solid" || hairKind === "cap" || hairKind === "hatch") {
        const pts = [];
        const steps = 8;
        const yl = hairKind === "cap" ? cy - hh * 0.45 : hairline;
        for (let i = 0; i <= steps; i++) {
            const a = Math.PI + (i / steps) * Math.PI;
            const px = cx + Math.cos(a) * (hw + 0.5) * rand(rha, 0.98, 1.05);
            pts.push([px, cy - Math.abs(Math.sin(a)) * (hh + rand(rha, 0, 2.5))]);
        }
        pts[0] = [cx - edgeX(yl), yl];
        pts[pts.length - 1] = [cx + edgeX(yl), yl];
        const back = [];
        const seg = pick(rha, [3, 4, 5]);
        const dip = pick(rha, [0, 0, 1, -1]);
        for (let i = seg - 1; i >= 1; i--) {
            const t = i / seg;
            const bx = cx - edgeX(yl) + t * 2 * edgeX(yl);
            const wave = rand(rha, -2.5, 2.5) + (dip !== 0 ? Math.sin(t * Math.PI) * dip * ((bx - cx) / hw) * 5 : 0);
            back.push([bx, yl + 3 + wave]);
        }
        const hairD = inkPath(rha, [...pts, ...back.reverse()], { close: true, wobble: 1.2 });
        if (hairKind === "hatch") {
            out.push({ d: hairD, width: 1.4, stroke: hairInk });
            hatchClip = hairD;
            const ang = pick(rha, [-1, 1]) * rand(rha, 0.5, 1.1);
            for (let hx = cx - hw - 6; hx < cx + hw + 6; hx += rand(rha, 2.2, 3.4)) {
                hatchLines.push(line(rha, [hx, cy - hh - 8], [hx + ang * 22, cy - hh * 0.2], 0.4));
            }
        }
        else {
            out.push({ d: hairD, fill: hairInk, stroke: hairInk });
        }
        if (hairKind === "cap") {
            const by = yl + 2;
            const bs = turn >= 0 ? 1 : -1;
            out.push({ d: line(rha, [cx + bs * edgeX(by), by], [cx + bs * (edgeX(by) + rand(rha, 5, 9)), by + rand(rha, 0, 2)], 1), width: 2, stroke: hairInk });
        }
    }
    else if (hairKind === "long" || hairKind === "bob") {
        // top mass
        const yl = hairline;
        const top = [];
        for (let i = 0; i <= 8; i++) {
            const a = Math.PI + (i / 8) * Math.PI;
            top.push([cx + Math.cos(a) * (hw + 1) * rand(rha, 0.99, 1.06), cy - Math.abs(Math.sin(a)) * (hh + rand(rha, 0.5, 3))]);
        }
        top[0] = [cx - edgeX(yl) - 1, yl];
        top[8] = [cx + edgeX(yl) + 1, yl];
        const fring = [];
        const seg2 = pick(rha, [3, 4]);
        const dip2 = pick(rha, [0, 1, -1]);
        for (let i = seg2 - 1; i >= 1; i--) {
            const t = i / seg2;
            const bx = cx - edgeX(yl) + t * 2 * edgeX(yl);
            fring.push([bx, yl + 3 + rand(rha, -2, 2) + (dip2 ? Math.sin(t * Math.PI) * dip2 * ((bx - cx) / hw) * 4 : 0)]);
        }
        out.push({ d: inkPath(rha, [...top, ...fring.reverse()], { close: true, wobble: 1.1 }), fill: hairInk, stroke: hairInk });
        // curtains framing the face
        const endY = hairKind === "bob" ? cy + hh * rand(rha, 0.05, 0.2) : cy + hh * rand(rha, 0.45, 0.7);
        for (const sC of [-1, 1]) {
            const topX = cx + sC * edgeX(yl) * 0.96;
            const curtain = [
                [topX, yl + 1],
                [cx + sC * (hw + rand(rha, 3, 6)), cy - hh * 0.15],
                [cx + sC * (hw + rand(rha, 2, 6)), endY],
                [cx + sC * (hw - rand(rha, 3, 6)), endY + rand(rha, 3, 6) * (hairKind === "bob" ? 0.5 : 1)],
                [cx + sC * edgeX((yl + endY) / 2) * 0.98, (yl + endY) / 2 + 4],
            ];
            out.push({ d: inkPath(rha, curtain, { close: true, wobble: 1 }), fill: hairInk, stroke: hairInk });
        }
    }
    else if (hairKind === "bun" || hairKind === "pony") {
        // solid cap mass
        const yl = hairline;
        const top = [];
        for (let i = 0; i <= 8; i++) {
            const a = Math.PI + (i / 8) * Math.PI;
            top.push([cx + Math.cos(a) * (hw + 0.5) * rand(rha, 0.98, 1.04), cy - Math.abs(Math.sin(a)) * (hh + rand(rha, 0, 2))]);
        }
        top[0] = [cx - edgeX(yl), yl];
        top[8] = [cx + edgeX(yl), yl];
        const back2 = [];
        for (let i = 3; i >= 1; i--) {
            const t = i / 4;
            back2.push([cx - edgeX(yl) + t * 2 * edgeX(yl), yl + 3 + rand(rha, -2, 2)]);
        }
        out.push({ d: inkPath(rha, [...top, ...back2.reverse()], { close: true, wobble: 1.1 }), fill: hairInk, stroke: hairInk });
        if (hairKind === "bun") {
            const bx = cx + rand(rha, -8, 8), by = cy - hh - rand(rha, 2, 5);
            out.push({ d: inkPath(rha, circlePts(bx, by, rand(rha, 5, 8)), { close: true, wobble: 1 }), fill: hairInk, stroke: hairInk });
        }
        else {
            const sP = chance(rha, 0.5) ? -1 : 1;
            const bx = cx + sP * hw * 0.8, by = cy - hh * 0.8;
            const tail = [
                [bx, by],
                [cx + sP * (hw + rand(rha, 7, 11)), cy - hh * rand(rha, 0.1, 0.35)],
                [cx + sP * (hw + rand(rha, 3, 8)), cy + hh * rand(rha, 0.3, 0.55)],
                [cx + sP * (hw + 1), cy + hh * 0.2],
                [cx + sP * (hw * 0.95), cy - hh * 0.4],
            ];
            out.push({ d: inkPath(rha, tail, { close: true, wobble: 1 }), fill: hairInk, stroke: hairInk });
        }
    }
    else if (hairKind === "spiky") {
        const nSpikes = Math.floor(rand(rha, 6, 10));
        for (let i = 0; i < nSpikes; i++) {
            const a = Math.PI + ((i + 0.5) / nSpikes) * Math.PI;
            const bx = cx + Math.cos(a) * hw * 0.97;
            const by = cy - Math.abs(Math.sin(a)) * hh * 0.97;
            const len = rand(rha, 4, 9);
            const ex2 = bx + Math.cos(a) * len * 0.9 + rand(rha, -1.5, 1.5);
            const ey2 = by - Math.abs(Math.sin(a)) * len - rand(rha, 0, 2);
            out.push({ d: line(rha, [bx, by], [ex2, ey2], 0.4), width: 1.5, stroke: hairInk });
        }
    }
    else if (hairKind === "curls") {
        const nC = Math.floor(rand(rha, 8, 12));
        for (let i = 0; i < nC; i++) {
            const a = Math.PI + ((i + 0.5) / nC) * Math.PI;
            const rr = rand(rha, 3, 4.5);
            const bx = cx + Math.cos(a) * (hw - rr * 0.3) * 1.02;
            const by = cy - Math.abs(Math.sin(a)) * (hh - rr * 0.3) * 1.05;
            out.push({ d: inkPath(rha, circlePts(bx, by, rr), { close: true, wobble: 0.45 }), width: 1.25, stroke: hairInk });
        }
    }
    else if (hairKind === "wisps") {
        for (let i = 0; i < 3; i++) {
            const bx = cx + rand(rha, -8, 8);
            const by = cy - hh * 1.0;
            out.push({ d: inkPath(rha, [[bx, by + 2], [bx + rand(rha, -2, 2), by - rand(rha, 3, 6)], [bx + rand(rha, -4, 4), by - rand(rha, 5, 9)]], { wobble: 0.5 }), width: 1.1, stroke: hairInk });
        }
    } // bald: nothing
    // --- extras: headphones, top hat, earring ---
    const rx3 = stream(seed, "extras");
    const extra = fem
        ? pick(rx3, ["none", "none", "none", "earring", "earring", "headphones", "flower", "beret"])
        : pick(rx3, ["none", "none", "none", "none", "none", "headphones", "tophat", "earring", "monocle", "beret"]);
    if (extra === "headphones" && hairKind !== "cap") {
        const hInk = colorOn ? accent : ink;
        const bandPts = [];
        for (let i = 0; i <= 6; i++) {
            const a = Math.PI + (i / 6) * Math.PI;
            bandPts.push([cx + Math.cos(a) * (hw + 3), cy - Math.abs(Math.sin(a)) * (hh + 3.5)]);
        }
        out.push({ d: inkPath(rx3, bandPts, { wobble: 0.8 }), width: 2, stroke: hInk });
        for (const s of [-1, 1]) {
            const px = cx + s * edgeX(earY);
            out.push({ d: inkPath(rx3, circlePts(px, earY, 3.6, 8), { close: true, wobble: 0.5 }), fill: hInk, stroke: hInk });
        }
    }
    else if (extra === "tophat" && (hairKind === "bald" || hairKind === "wisps" || hairKind === "spiky")) {
        const hInk = colorOn && chance(rx3, 0.4) ? accent : ink;
        const topY = cy - hh - 1;
        const bw2 = hw * rand(rx3, 0.55, 0.68), ht = rand(rx3, 14, 20);
        out.push({ d: inkPath(rx3, [[cx - bw2, topY + 2], [cx - bw2 + rand(rx3, -1.5, 1.5), topY - ht], [cx + bw2 + rand(rx3, -1.5, 1.5), topY - ht], [cx + bw2, topY + 2]], { close: true, wobble: 0.9 }), fill: hInk, stroke: hInk });
        out.push({ d: line(rx3, [cx - bw2 - rand(rx3, 4, 7), topY + 3], [cx + bw2 + rand(rx3, 4, 7), topY + 2.5], 0.8), width: 2, stroke: hInk });
    }
    else if (extra === "flower") {
        const sF = chance(rx3, 0.5) ? -1 : 1;
        const fx = cx + sF * hw * 0.72, fy = cy - hh * 0.72;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            out.push({ d: inkPath(rx3, circlePts(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.7, 6), { close: true, wobble: 0.3 }), width: 1, stroke: colorOn ? accent : ink });
        }
        dots.push(`<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="1.3"${colorOn ? ` fill="${accent}"` : ""}/>`);
    }
    else if (extra === "monocle" && !hasGlasses) {
        const sM = chance(rx3, 0.5) ? -1 : 1;
        const mx2 = sM > 0 ? rx2 : lx;
        out.push({ d: inkPath(rx3, circlePts(mx2, ey, rEye + 3.2), { close: true, wobble: 0.6 }), width: 1.3 });
        out.push({ d: line(rx3, [mx2 + rEye + 2, ey + 3], [mx2 + rEye + 4, ey + hh * 0.45], 0.6), width: 0.9 });
    }
    else if (extra === "beret" && (hairKind === "bald" || hairKind === "wisps" || hairKind === "spiky" || fem)) {
        const bInk = colorOn ? accent : ink;
        const by2 = cy - hh * 0.82;
        const bpts = [
            [cx - hw * 0.85, by2 + 4], [cx - hw * 0.95, by2 - 3], [cx - hw * 0.3, by2 - 9],
            [cx + hw * 0.5, by2 - 8], [cx + hw * 0.95, by2 - 1], [cx + hw * 0.8, by2 + 5],
        ];
        out.push({ d: inkPath(rx3, bpts, { close: true, wobble: 1 }), fill: bInk, stroke: bInk });
        out.push({ d: line(rx3, [cx, by2 - 9], [cx + rand(rx3, -1, 2), by2 - 13], 0.4), width: 1.6, stroke: bInk });
    }
    else if (extra === "earring" && (hasEars || fem)) {
        const s = turn > 0.5 ? -1 : turn < -0.5 ? 1 : (chance(rx3, 0.5) ? -1 : 1);
        const px = cx + s * edgeX(earY);
        dots.push(`<circle cx="${(px + s * 1.2).toFixed(1)}" cy="${(earY + 5.6).toFixed(1)}" r="1.1"${colorOn ? ` fill="${accent}"` : ""}/>`);
    }
    // ---------- assemble ----------
    const S = 100;
    const rpen = stream(seed, "pen");
    const strokeW = rand(rpen, 1.3, 2.1);
    let body = "";
    let openTag;
    for (const p of out) {
        if (p.tag !== openTag) {
            if (openTag)
                body += "</g>";
            if (p.tag)
                body += `<g data-mug="${p.tag}">`;
            openTag = p.tag;
        }
        body += `<path d="${p.d}" fill="${p.fill ?? "none"}" stroke="${p.stroke ?? ink}" stroke-width="${(p.width ?? strokeW).toFixed(2)}"${p.opacity ? ` opacity="${p.opacity}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (openTag)
        body += "</g>";
    const clipId = "mug" + (xmur3(seed)() >>> 0).toString(36);
    const hatch = hatchClip
        ? `<clipPath id="${clipId}"><path d="${hatchClip}"/></clipPath><g clip-path="url(#${clipId})" stroke="${out.find(o => o.d === hatchClip)?.stroke ?? ink}" stroke-width="1.1" fill="none">${hatchLines.map(d => `<path d="${d}"/>`).join("")}</g>`
        : "";
    let pre = "";
    if (options.backdrop) {
        const rbd = stream(seed, "backdrop");
        const shape = pick(rbd, ["disc", "disc", "square", "blob"]);
        const bdC = colorOn ? accent : "#d8d2c4";
        if (shape === "disc")
            pre = `<circle cx="50" cy="52" r="${rand(rbd, 40, 46).toFixed(0)}" fill="${bdC}" opacity="0.22"/>`;
        else if (shape === "square")
            pre = `<rect x="8" y="10" width="84" height="84" rx="16" fill="${bdC}" opacity="0.22" transform="rotate(${rand(rbd, -4, 4).toFixed(1)} 50 52)"/>`;
        else
            pre = `<path d="${inkPath(rbd, circlePts(50, 52, 43, 9), { close: true, wobble: 5 })}" fill="${bdC}" opacity="0.22"/>`;
    }
    let bustSvg = "";
    if (options.bust) {
        const rbu = stream(seed, "bust");
        const shTop = cy + hh - 2;
        const shirtInk = colorOn && chance(rbu, 0.7) ? accent : ink;
        const shoulders = [
            [cx - hw * 1.35, 104], [cx - hw * 1.25, shTop + 9], [cx - hw * 0.55, shTop + 1],
            [cx + hw * 0.55, shTop + 1], [cx + hw * 1.25, shTop + 9], [cx + hw * 1.35, 104],
        ];
        const filled = chance(rbu, 0.6);
        bustSvg += `<path d="${inkPath(rbu, shoulders, { close: true, wobble: 1.2 })}" fill="${filled ? shirtInk : (options.paper ?? "#f4f1ea")}" stroke="${ink}" stroke-width="${strokeW.toFixed(2)}" stroke-linejoin="round"/>`;
        if (!filled && chance(rbu, 0.5)) { // collar ticks
            bustSvg += `<path d="${line(rbu, [cx - 5, shTop + 2], [cx - 8, shTop + 8], 0.5)}" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>`;
            bustSvg += `<path d="${line(rbu, [cx + 5, shTop + 2], [cx + 8, shTop + 8], 0.5)}" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>`;
        }
        if (chance(rbu, 0.18)) { // bowtie
            const byT = shTop + 3;
            bustSvg += `<path d="M${cx - 6} ${byT - 3} L${cx - 1} ${byT} L${cx - 6} ${byT + 3} Z M${cx + 6} ${byT - 3} L${cx + 1} ${byT} L${cx + 6} ${byT + 3} Z" fill="${colorOn ? accent : ink}" stroke="${ink}" stroke-width="1"/>`;
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${size}" height="${size}">` +
        (bg !== "transparent" ? `<rect width="${S}" height="${S}" fill="${bg}"/>` : "") +
        pre + bustSvg + body + hatch +
        `<g fill="${ink}">${dots.join("")}</g>` +
        `<g data-mug="pupils" fill="${ink}">${pupils.join("")}</g></svg>`;
    return {
        svg, ink, accent, style: fem ? "fem" : "masc",
        eyes: {
            left: [lx, ey], right: [rx2, ey], r: rEye,
            leftOpen: kind !== "sleepy" && !(kind === "wink" && winkSide),
            rightOpen: kind !== "sleepy" && !(kind === "wink" && !winkSide),
        },
    };
}
/**
 * Browser-only: render a face straight to a PNG data URL (e.g. 512px for a
 * GitHub profile picture). Portrait defaults: bust + backdrop + paper.
 */
export function facePng(seed, options = {}) {
    const size = options.size ?? 512;
    const svg = face(seed, { bust: true, backdrop: true, background: "#f4f1ea", ...options, size });
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = c.height = size;
            c.getContext("2d").drawImage(img, 0, 0, size, size);
            resolve(c.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    });
}
