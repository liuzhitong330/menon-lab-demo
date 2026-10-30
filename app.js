(function () {
  'use strict';
  const datasets = window.MENON_DATA.datasets;
  const primary = datasets.filter(d => d.id !== 'sst_neurosynth');
  const $ = id => document.getElementById(id);
  const ns = 'http://www.w3.org/2000/svg';
  const f = (x, digits = 2) => Number(x).toFixed(digits);
  const signed = x => `${x >= 0 ? '+' : ''}${f(x)}%`;
  let currentId = 'sst', selectedRow = 2;
  const current = () => datasets.find(d => d.id === currentId);
  const short = {axcpt:'AxCPT',cuedts:'Cued switching',sternberg:'Sternberg',stroop:'Stroop',sst:'Stop-signal',rp1:'Relational 1',rp2:'Relational 2'};
  const el = (name, attrs, text) => {
    const node = document.createElementNS(ns, name);
    Object.entries(attrs || {}).forEach(([k,v]) => node.setAttribute(k,v));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const append = (svg, name, attrs, text) => { const n=el(name,attrs,text); svg.append(n); return n; };
  const extent = values => {
    const min=Math.min(...values), max=Math.max(...values), pad=(max-min)*.08 || 1;
    return [min-pad,max+pad];
  };
  const scale = (domain, range) => value => range[0]+(value-domain[0])/(domain[1]-domain[0])*(range[1]-range[0]);
  primary.forEach(d => $('task').add(new Option(d.label,d.id)));
  $('task').value = 'sst';

  function update() {
    const d=current(), m=d.metrics;
    $('roi-label').hidden = !currentId.startsWith('sst');
    $('record').replaceChildren(...d.rows.map(r => new Option(`Excel row ${r.source_row} · occupancy ${f(r.x*100,1)}%`,r.source_row)));
    if (!d.rows.some(r => r.source_row===selectedRow)) selectedRow=d.rows[0].source_row;
    $('record').value=String(selectedRow);
    $('metric-one').textContent=d.n;
    $('metric-two').textContent=f(m.r,3);
    $('metric-three').textContent=signed(m.rmse_improvement);
    $('caption').textContent=`${d.sheet} · ${d.n} exported paired observations. Performance index in published source units; source-row labels are not participant IDs.`;
    $('interpretation').textContent=`The correlation is ${f(m.r,3)}, but leaving out each observation yields only ${f(m.rmse_improvement)}% lower RMSE than the training-fold mean. Removing one row changes the correlation from ${f(m.loo_r_min,3)} to ${f(m.loo_r_max,3)}. That range diagnoses influence; it is not a confidence interval.`;
    if(currentId.startsWith('sst')) {
      const alt=datasets.find(x=>x.id==='sst_neurosynth'), orig=datasets.find(x=>x.id==='sst');
      $('interpretation').textContent += ` The ROI sensitivity check gives ${f(orig.metrics.rmse_improvement)}% (original) versus ${f(alt.metrics.rmse_improvement)}% (NeuroSynth) RMSE reduction: a modest gain under either definition, not a large predictive effect.`;
    }
    plot(); readout(); compare();
  }
  function plot() {
    const d=current(), m=d.metrics, svg=$('hero-viz'), prediction=$('view').value==='prediction';
    const width=Math.max(260,svg.clientWidth), height=340, left=48, right=12, top=22, bottom=56;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`); svg.replaceChildren();
    const xd=extent(d.rows.map(r=>prediction?r.y:r.x*100));
    const yd=prediction?extent(d.rows.flatMap(r=>[r.y,r.loo_pred,r.baseline_pred])):extent(d.rows.map(r=>r.y));
    if(prediction) { const both=extent(d.rows.flatMap(r=>[r.y,r.loo_pred,r.baseline_pred])); xd.splice(0,2,...both); yd.splice(0,2,...both); }
    const sx=scale(xd,[left,width-right]), sy=scale(yd,[height-bottom,top]);
    for(let i=0;i<5;i++) {
      const x=xd[0]+i*(xd[1]-xd[0])/4, y=yd[0]+i*(yd[1]-yd[0])/4;
      append(svg,'line',{x1:left,x2:width-right,y1:sy(y),y2:sy(y),class:'grid'});
      append(svg,'text',{x:left-7,y:sy(y)+4,'text-anchor':'end'},f(y,1));
      append(svg,'text',{x:sx(x),y:height-bottom+20,'text-anchor':'middle'},f(x,1));
    }
    append(svg,'line',{x1:left,x2:width-right,y1:height-bottom,y2:height-bottom,class:'axis'});
    append(svg,'text',{x:(left+width-right)/2,y:height-8,'text-anchor':'middle'},prediction?'Observed performance (source units)':'Shared-state occupancy (%)');
    append(svg,'text',{x:left,y:12},prediction?'Held-out estimate (source units)':'Performance index (source units)');
    if(prediction) {
      append(svg,'line',{x1:sx(xd[0]),x2:sx(xd[1]),y1:sy(xd[0]),y2:sy(xd[1]),class:'identity'});
      d.rows.forEach(r=>append(svg,'circle',{cx:sx(r.y),cy:sy(r.baseline_pred),r:2.2,class:'baseline'}));
    } else {
      const lo=Math.min(...d.rows.map(r=>r.x)),hi=Math.max(...d.rows.map(r=>r.x));
      append(svg,'line',{x1:sx(lo*100),x2:sx(hi*100),y1:sy(m.intercept+m.slope*lo),y2:sy(m.intercept+m.slope*hi),class:'fit'});
    }
    d.rows.forEach(r=> {
      const dot=append(svg,'circle',{cx:sx(prediction?r.y:r.x*100),cy:sy(prediction?r.loo_pred:r.y),r:r.source_row===selectedRow?6:4.5,class:`observation${r.source_row===selectedRow?' selected':''}`,tabindex:'0',role:'button','aria-label':`Inspect source row ${r.source_row}, occupancy ${f(r.x*100,1)} percent`});
      const choose=()=>{selectedRow=r.source_row;$('record').value=String(selectedRow);readout();svg.querySelectorAll('.observation').forEach(n=>{n.classList.remove('selected');n.setAttribute('r','4.5');});dot.classList.add('selected');dot.setAttribute('r','6');};
      dot.addEventListener('click',choose);
      dot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
      dot.append(el('title',{},`Source row ${r.source_row}: occupancy ${f(r.x*100)}%, performance ${f(r.y,3)}`));
    });
    $('plot-note').textContent=prediction?'Teal: held-out linear estimates. Gray: training-fold mean baseline. Dashed line: perfect agreement.':'Teal points: published pairs. Line: full-sample linear fit. Select a point or source row to inspect its influence.';
  }
  function readout() {
    const d=current(), r=d.rows.find(r=>r.source_row===selectedRow);
    $('readout').textContent=`Source row ${r.source_row}: occupancy ${f(r.x*100)}%; observed performance ${f(r.y,3)}; held-out estimate ${f(r.loo_pred,3)}; training mean ${f(r.baseline_pred,3)}. Absolute error: ${f(Math.abs(r.y-r.loo_pred),3)} versus ${f(Math.abs(r.y-r.baseline_pred),3)} for the baseline. Correlation without this row: ${f(r.loo_r,3)}.`;
  }
  function compare() {
    const measure=$('loss').value, key=`${measure}_improvement`, svg=$('comparison-viz');
    const width=Math.max(260,svg.clientWidth), height=300, left=width<400?104:118, right=42;
    const values=primary.map(d=>d.metrics[key]), max=Math.max(...values)*1.2;
    const sx=scale([Math.min(0,...values),max],[left,width-right]);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();
    append(svg,'line',{x1:sx(0),x2:sx(0),y1:10,y2:255,class:'axis'});
    primary.forEach((d,i)=>{const y=26+i*34,v=d.metrics[key];append(svg,'text',{x:left-8,y:y+4,'text-anchor':'end'},short[d.id]);append(svg,'line',{x1:sx(0),x2:sx(v),y1:y,y2:y,class:'fit'});append(svg,'circle',{cx:sx(v),cy:y,r:4,fill:'#1f7a8c'});append(svg,'text',{x:sx(v)+8,y:y+4},`${f(v,1)}%`);});
    append(svg,'text',{x:(left+width-right)/2,y:281,'text-anchor':'middle'},`${measure.toUpperCase()} reduction (%)`);
    $('comparison').replaceChildren(...primary.map(d=>{
      const b=document.createElement('button');b.type='button';b.className=d.id===(currentId.startsWith('sst')?'sst':currentId)?'active':'';
      const label=document.createElement('span');label.textContent=d.label;
      const val=document.createElement('span');val.textContent=`${signed(d.metrics[key])} · n=${d.n}`;
      b.append(label,val);b.addEventListener('click',()=>{$('task').value=d.id;$('roi').value='sst';currentId=d.id;selectedRow=2;update();$('a1').scrollIntoView();});return b;
    }));
    const sorted=[...primary].sort((a,b)=>b.metrics[key]-a.metrics[key]);
    $('comparison-readout').textContent=`Under ${measure.toUpperCase()}, the largest observed gain is ${short[sorted[0].id]} (${f(sorted[0].metrics[key])}%) and the smallest is ${short[sorted.at(-1).id]} (${f(sorted.at(-1).metrics[key])}%). Switching error measures changes the ordering. Choose the cost of errors before validation; do not pick the most favorable metric afterward.`;
  }
  $('task').addEventListener('change',()=>{currentId=$('task').value;$('roi').value='sst';selectedRow=2;update();});
  $('roi').addEventListener('change',()=>{currentId=$('roi').value;update();});
  $('view').addEventListener('change',plot);
  $('record').addEventListener('change',()=>{selectedRow=Number($('record').value);plot();readout();});
  $('loss').addEventListener('change',compare);
  $('download').addEventListener('click',()=>{
    const d=current();const fields=['source_row','x','y','yhat','loo_pred','baseline_pred','loo_r'];
    const csv=['sheet,'+fields.join(','),...d.rows.map(r=>d.sheet+','+fields.map(k=>r[k]).join(','))].join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})), a=document.createElement('a');a.href=url;a.download=`${d.id}-conditional-readout.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  new ResizeObserver(()=>{plot();compare();}).observe($('hero-viz'));
  update();
})();
