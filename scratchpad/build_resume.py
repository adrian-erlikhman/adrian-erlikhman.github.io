import pymupdf, sys, os

# Regenerate resume.pdf:  python3 build_resume.py <repo>/resume.pdf
# original_resume.pdf must sit next to this script.
HERE=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(HERE,'original_resume.pdf')
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'..','resume.pdf')
FULL_REG='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
FULL_BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'

orig=pymupdf.open(SRC)
FB=pymupdf.Font(fontfile=FULL_BOLD); FR=pymupdf.Font(fontfile=FULL_REG)

def rgb(c): return ((c>>16&255)/255,(c>>8&255)/255,(c&255)/255)
NAVY=(0.1020,0.2392,0.4275); INK=(0.0863,0.0941,0.1137); GRAY=(0.7804,0.8039,0.8392)
LEFT=33.2; BODY_X=40.7; RIGHT=578.6; BULLET_X=33.2; SIZE=8.1
INSERT_Y=141.2; DELTA=23.6
REDACT_TOP=137.0; REDACT_BOT=406.0
ALIAS={'DejaVuSerif-Bold':'db','DejaVuSerif-Italic':'db','DejaVuSerif':'dr'}

new=pymupdf.open()
# ---- page 1 (index 0): remove the "Mandala Space Ventures" experience entry and
# close the vertical gap. Rendered via show_pdf_page so original fonts/vectors are
# preserved exactly and text stays selectable. ----
CUT_TOP=611.0; CUT_H=51.3; CUT_BOT=CUT_TOP+CUT_H
W0=orig[0].rect.width; H0=orig[0].rect.height
p0=new.new_page(width=W0,height=H0)
p0.show_pdf_page(pymupdf.Rect(0,0,W0,CUT_TOP), orig, 0, clip=pymupdf.Rect(0,0,W0,CUT_TOP))
p0.show_pdf_page(pymupdf.Rect(0,CUT_TOP,W0,H0-CUT_H), orig, 0, clip=pymupdf.Rect(0,CUT_BOT,W0,H0))
# show_pdf_page drops annotations; re-add page-1 links (only the header email link,
# which sits in the untouched top slice — shift any that fall in the moved slice).
for lk in orig[0].get_links():
    fr=lk.get('from')
    if fr.y1<=CUT_TOP:
        p0.insert_link(lk)
    elif fr.y0>=CUT_BOT:
        lk=dict(lk); lk['from']=fr+(0,-CUT_H,0,-CUT_H); p0.insert_link(lk)
# ---- page 2 (index 1): copy then re-typeset the lower portion (logic below) ----
new.insert_pdf(orig, from_page=1, to_page=1)
p2=new[1]

redraw=[]
for b in orig[1].get_text('dict')['blocks']:
    for l in b.get('lines',[]):
        for s in l['spans']:
            if not s['text'].strip(): continue
            oy=s['origin'][1]
            if INSERT_Y<=oy<=REDACT_BOT:
                redraw.append((s['origin'][0],oy,s['text'],s['font'],s['size'],s['color']))

p2.add_redact_annot(pymupdf.Rect(0,REDACT_TOP,612,REDACT_BOT), fill=(1,1,1))
p2.apply_redactions()
p2.insert_font(fontname='dr', fontfile=FULL_REG)
p2.insert_font(fontname='db', fontfile=FULL_BOLD)

maxy=0
for ox,oy,txt,font,size,color in redraw:
    y=oy+DELTA
    p2.insert_text((ox,y),txt,fontname=ALIAS.get(font,'dr'),fontsize=size,color=rgb(color))
    maxy=max(maxy,y)
for ry in (272.9,365.6):
    p2.draw_rect(pymupdf.Rect(33.4,ry+DELTA-0.3,RIGHT,ry+DELTA+0.3),color=None,fill=GRAY)

def wrap(text,first_w,full_w,size=SIZE):
    words=text.split(' '); lines=[]; cur=''; w=first_w
    for wd in words:
        t=(cur+' '+wd).strip()
        if FR.text_length(t,size)<=w: cur=t
        else: lines.append(cur); cur=wd; w=full_w
    if cur: lines.append(cur)
    return lines

# eDNAtlas as the first project
p2.insert_text((BULLET_X,141.2),'▪',fontname='dr',fontsize=5.2,color=NAVY)
nm='eDNAtlas'; nmw=FB.text_length(nm,SIZE)
p2.insert_text((BODY_X,144.6),nm,fontname='db',fontsize=SIZE,color=INK)
sep=' — '; sepw=FR.text_length(sep,SIZE)
desc=('an interactive map that turns raw environmental DNA into a plain-language '
      'health score for coastal sites; standards-aligned (Darwin Core) and open by default.')
lines=wrap(desc,RIGHT-(BODY_X+nmw+sepw),RIGHT-BODY_X)
p2.insert_text((BODY_X+nmw,144.6),sep+lines[0],fontname='dr',fontsize=SIZE,color=INK)
if len(lines)>1:
    p2.insert_text((BODY_X,155.6),lines[1],fontname='dr',fontsize=SIZE,color=INK)

# AWARDS & HONORS section (multiple entries)
ay=maxy+26
p2.insert_text((LEFT,ay),'AWARDS & HONORS',fontname='db',fontsize=SIZE,color=NAVY)
p2.draw_rect(pymupdf.Rect(33.4,ay+4.0,RIGHT,ay+4.6),color=None,fill=GRAY)

AWARDS=[
 ('eDNAtlas',' — 1st place, Decode the Ocean Hackathon (Lovable × United Nations), 2026.'),
 ('Citadel Terminal (Correlation One)',' — finalist in the algorithmic-strategy competition.'),
 ('Y Combinator Startup School',' — admitted at a sub-5% acceptance rate, with $30,000+ in partner credits.'),
 ('JFEDLA Teen Innovation Grant',' — awarded to SafeJew, 2024.'),
 ('LAUSD Student Innovation Challenge',' — invited presenter, $10,000 challenge.'),
 ('USA Fencing',' — Team USA, Épée; U.S. No. 49 Junior and No. 78 Senior; Region 4 Champion; 3× All-American and 3× All-Academic First Team.'),
 ('Class Rank 1 of 215',' — LACES, Class of 2027.'),
]
y=ay+16
for lead,tail in AWARDS:
    p2.insert_text((BULLET_X,y-3.4),'▪',fontname='dr',fontsize=5.2,color=NAVY)
    lw=FB.text_length(lead,SIZE)
    p2.insert_text((BODY_X,y),lead,fontname='db',fontsize=SIZE,color=INK)
    spw=FR.text_length(' ',SIZE)
    # wrap the tail into an arbitrary number of lines: first line starts after
    # the bold lead, every following line runs full body width.
    words=tail.strip().split(' '); lines=[]; cur=''
    wcap=RIGHT-(BODY_X+lw+spw)
    for wd in words:
        t=(cur+' '+wd) if cur else wd
        if FR.text_length(t,SIZE)<=wcap: cur=t
        else:
            lines.append(cur); cur=wd; wcap=RIGHT-BODY_X
    if cur: lines.append(cur)
    p2.insert_text((BODY_X+lw+spw,y),lines[0],fontname='dr',fontsize=SIZE,color=INK)
    for extra in lines[1:]:
        y+=11; p2.insert_text((BODY_X,y),extra,fontname='dr',fontsize=SIZE,color=INK)
    y+=13.2

new.save(OUT, garbage=4, deflate=True)
print('saved',OUT,'| awards end y ~',round(y,1))
