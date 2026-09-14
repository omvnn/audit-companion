import { assessImageQuality } from './import-quality.mjs';

export const IMPORT_DEPENDENCY_URLS=Object.freeze({
  pdfjs:'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',
  pdfWorker:'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs',
  tesseract:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js',
});

const ACCEPTED_TYPES=new Set(['application/pdf','image/jpeg','image/png']);
export function supportedImportFile(file={}){
  if(ACCEPTED_TYPES.has(String(file.type||'').toLowerCase()))return true;
  return /\.(?:pdf|jpe?g|png)$/i.test(String(file.name||''));
}

function canvasFromBitmap(bitmap){
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  canvas.getContext('2d',{willReadFrequently:true}).drawImage(bitmap,0,0);
  return canvas;
}

async function defaultRasterizeImage(file){
  if(typeof createImageBitmap!=='function')throw new Error('Image decoding is not supported by this browser');
  const bitmap=await createImageBitmap(file);
  try{return [{pageNumber:1,canvas:canvasFromBitmap(bitmap)}];}finally{bitmap.close?.();}
}

async function loadPdfJs(){
  const pdfjs=await import(IMPORT_DEPENDENCY_URLS.pdfjs);
  if(pdfjs?.GlobalWorkerOptions)pdfjs.GlobalWorkerOptions.workerSrc=IMPORT_DEPENDENCY_URLS.pdfWorker;
  return pdfjs;
}

async function defaultRasterizePdf(file){
  const pdfjs=await loadPdfJs();
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjs.getDocument({data:bytes}).promise;
  const pages=[];
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
    const page=await pdf.getPage(pageNumber);
    const viewport=page.getViewport({scale:2});
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;
    pages.push({pageNumber,canvas});
  }
  return pages;
}

let tesseractPromise;
function loadTesseract(){
  if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);
  if(tesseractPromise)return tesseractPromise;
  tesseractPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=IMPORT_DEPENDENCY_URLS.tesseract;script.async=true;script.crossOrigin='anonymous';
    script.onload=()=>globalThis.Tesseract?resolve(globalThis.Tesseract):reject(new Error('OCR library failed to initialize'));
    script.onerror=()=>reject(new Error('OCR library could not be loaded'));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}
async function defaultOcr(canvas){
  const Tesseract=await loadTesseract();
  const result=await Tesseract.recognize(canvas,'eng',{logger:()=>{}});
  const data=result?.data||{};
  return {text:String(data.text||''),confidence:Math.max(0,Math.min(1,(Number(data.confidence)||0)/100))};
}

export function measureCanvasQuality(canvas){
  const width=Number(canvas?.width)||0,height=Number(canvas?.height)||0;
  if(!width||!height)return assessImageQuality({width,height,sharpness:0,contrast:0,brightness:0,glareRatio:1,cropRatio:1});
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=ctx.getImageData(0,0,width,height).data;
  const step=Math.max(1,Math.floor(Math.sqrt((width*height)/250000)));
  let n=0,sum=0,sumSq=0,glare=0,sharp=0,gradN=0,edgeDark=0,edgeN=0;
  const lum=(idx)=>0.2126*data[idx]+0.7152*data[idx+1]+0.0722*data[idx+2];
  for(let y=0;y<height;y+=step){
    for(let x=0;x<width;x+=step){
      const idx=(y*width+x)*4,l=lum(idx);n++;sum+=l;sumSq+=l*l;if(l>245)glare++;
      if(x+step<width){sharp+=Math.abs(l-lum((y*width+Math.min(width-1,x+step))*4));gradN++;}
      if(y+step<height){sharp+=Math.abs(l-lum((Math.min(height-1,y+step)*width+x)*4));gradN++;}
      const border=x<width*0.03||x>width*0.97||y<height*0.03||y>height*0.97;
      if(border){edgeN++;if(l<110)edgeDark++;}
    }
  }
  const brightness=n?sum/n:0;
  const contrast=n?Math.sqrt(Math.max(0,sumSq/n-brightness*brightness)):0;
  const sharpness=gradN?sharp/gradN*12:0;
  const glareRatio=n?glare/n:1;
  const cropRatio=edgeN?edgeDark/edgeN:1;
  return assessImageQuality({width,height,sharpness,contrast,brightness,glareRatio,cropRatio});
}

export function createImportDependencies(){
  return {rasterizePdf:defaultRasterizePdf,rasterizeImage:defaultRasterizeImage,measureQuality:measureCanvasQuality,ocr:defaultOcr};
}

export async function rasterizeImport(file,deps=createImportDependencies()){
  if(!supportedImportFile(file))throw Object.assign(new Error('Unsupported file. Upload a PDF, JPG or PNG.'),{code:'UNSUPPORTED_FILE'});
  const isPdf=String(file.type||'').toLowerCase()==='application/pdf'||/\.pdf$/i.test(String(file.name||''));
  return isPdf?deps.rasterizePdf(file):deps.rasterizeImage(file);
}

export async function extractPages(file,deps=createImportDependencies()){
  const rasters=await rasterizeImport(file,deps);
  const out=[];
  for(const raster of [...rasters].sort((a,b)=>a.pageNumber-b.pageNumber)){
    const quality=deps.measureQuality(raster.canvas);
    if(!quality.passed){
      out.push({pageNumber:raster.pageNumber,qualityStatus:'failed',failureReason:quality.errors[0]||'QUALITY_FAILED',quality,confidence:0,text:'',canvas:raster.canvas});
      continue;
    }
    const ocr=await deps.ocr(raster.canvas);
    out.push({pageNumber:raster.pageNumber,qualityStatus:'passed',failureReason:'',quality,confidence:Number(ocr.confidence)||0,text:String(ocr.text||''),canvas:raster.canvas});
  }
  return out;
}
