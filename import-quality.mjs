export const DEFAULT_IMPORT_THRESHOLDS=Object.freeze({
  highConfidence:0.90,
  mediumConfidence:0.75,
  minWidth:900,
  minHeight:1200,
  minSharpness:60,
  minContrast:18,
  minBrightness:45,
  maxBrightness:225,
  maxGlareRatio:0.18,
  maxCropRatio:0.20,
});

export function confidenceBand(value){
  const n=Number(value)||0;
  if(n>=DEFAULT_IMPORT_THRESHOLDS.highConfidence)return 'high';
  if(n>=DEFAULT_IMPORT_THRESHOLDS.mediumConfidence)return 'medium';
  return 'low';
}

export function assessImageQuality(metrics={},thresholds=DEFAULT_IMPORT_THRESHOLDS){
  const errors=[];
  const width=Number(metrics.width)||0,height=Number(metrics.height)||0;
  const sharpness=Number(metrics.sharpness)||0,contrast=Number(metrics.contrast)||0;
  const brightness=Number(metrics.brightness)||0,glareRatio=Number(metrics.glareRatio)||0,cropRatio=Number(metrics.cropRatio)||0;
  if(width<thresholds.minWidth||height<thresholds.minHeight)errors.push('LOW_RESOLUTION');
  if(sharpness<thresholds.minSharpness)errors.push('BLURRY_PAGE');
  if(contrast<thresholds.minContrast)errors.push('LOW_CONTRAST');
  if(brightness<thresholds.minBrightness)errors.push('UNDEREXPOSED');
  if(brightness>thresholds.maxBrightness||glareRatio>thresholds.maxGlareRatio)errors.push('GLARE');
  if(cropRatio>thresholds.maxCropRatio)errors.push('CROPPED_PAGE');
  return {passed:errors.length===0,errors,metrics:{width,height,sharpness,contrast,brightness,glareRatio,cropRatio}};
}

export function shouldUseAiFallback({qualityPassed,confidence,aiEnabled}){
  return Boolean(aiEnabled&&qualityPassed&&confidenceBand(confidence)==='medium');
}

export function blockingImportIssues({pages=[],items=[]}={}){
  const issues=[];
  for(const page of pages){
    if(page.qualityStatus==='failed')issues.push({code:'PAGE_FAILED',pageNumber:page.pageNumber,reason:page.failureReason||'QUALITY_FAILED'});
  }
  for(const item of items){
    const values=[item.textConfidence,item.clauseConfidence,item.methodConfidence].filter(v=>v!==undefined&&v!==null).map(Number);
    if(values.length&&Math.min(...values)<DEFAULT_IMPORT_THRESHOLDS.mediumConfidence){
      issues.push({code:'ITEM_LOW_CONFIDENCE',position:item.position});
    }
  }
  return issues;
}
