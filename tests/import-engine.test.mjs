import test from 'node:test';
import assert from 'node:assert/strict';
import {
  supportedImportFile,
  extractPages,
  IMPORT_DEPENDENCY_URLS,
} from '../import-engine.mjs';

test('import engine accepts PDF JPG PNG and rejects unsupported files',()=>{
  assert.equal(supportedImportFile({type:'application/pdf',name:'plan.pdf'}),true);
  assert.equal(supportedImportFile({type:'image/jpeg',name:'plan.jpg'}),true);
  assert.equal(supportedImportFile({type:'image/png',name:'plan.png'}),true);
  assert.equal(supportedImportFile({type:'text/plain',name:'plan.txt'}),false);
});

test('dependency URLs are version pinned',()=>{
  assert.match(IMPORT_DEPENDENCY_URLS.pdfjs,/pdfjs-dist@4\.10\.38/);
  assert.match(IMPORT_DEPENDENCY_URLS.tesseract,/tesseract\.js@6\.0\.1/);
});

test('extractPages preserves page order and returns OCR plus quality using injected dependencies',async()=>{
  const file={type:'application/pdf',name:'plan.pdf'};
  const deps={
    async rasterizePdf(){return [
      {pageNumber:1,canvas:{id:1}},
      {pageNumber:2,canvas:{id:2}},
    ];},
    async rasterizeImage(){throw new Error('not expected');},
    measureQuality(canvas){return {passed:true,errors:[],metrics:{width:1200,height:1600,sharpness:100,contrast:30,brightness:140,glareRatio:0,cropRatio:0},canvasId:canvas.id};},
    async ocr(canvas){return {text:`page ${canvas.id}`,confidence:0.93};},
  };
  const pages=await extractPages(file,deps);
  assert.deepEqual(pages.map(p=>p.pageNumber),[1,2]);
  assert.deepEqual(pages.map(p=>p.text),['page 1','page 2']);
  assert.ok(pages.every(p=>p.qualityStatus==='passed'));
});

test('extractPages does not OCR a failed-quality page',async()=>{
  let ocrCalls=0;
  const file={type:'image/jpeg',name:'blur.jpg'};
  const deps={
    async rasterizePdf(){throw new Error('not expected');},
    async rasterizeImage(){return [{pageNumber:1,canvas:{}}];},
    measureQuality(){return {passed:false,errors:['BLURRY_PAGE'],metrics:{}};},
    async ocr(){ocrCalls++;return {text:'should not happen',confidence:1};},
  };
  const pages=await extractPages(file,deps);
  assert.equal(ocrCalls,0);
  assert.equal(pages[0].qualityStatus,'failed');
  assert.equal(pages[0].failureReason,'BLURRY_PAGE');
});
