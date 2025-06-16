    /**
 * Sistema de monitoramento de consumo de dados
 */

class DataConsumptionMonitor {
  constructor() {
    this.sessionData = {
      totalBytes: 0,
      requestCount: 0,
      responseCount: 0,
      imageBytes: 0,
      scriptBytes: 0,
      stylesheetBytes: 0,
      documentBytes: 0,
      otherBytes: 0,
      startTime: Date.now(),
      requests: []
    };
  }

  /**
   * Configura o monitoramento em uma página
   * @param {Page} page - Página do Playwright
   * @param {Object} config - Configuração
   */
  async setupMonitoring(page, config) {
    const monitor = this;

    // Intercepta todas as requisições
    page.on('request', request => {
      monitor.sessionData.requestCount++;
      
      if (config.debug) {
        const url = request.url();
        const method = request.method();
        const resourceType = request.resourceType();
        
        monitor.sessionData.requests.push({
          type: 'request',
          url: url.slice(0, 100),
          method,
          resourceType,
          timestamp: Date.now()
        });
      }
    });

    // Intercepta todas as respostas
    page.on('response', async response => {
      monitor.sessionData.responseCount++;
      
      try {
        const request = response.request();
        const url = request.url();
        const resourceType = request.resourceType();
        const status = response.status();
        
        // Tenta obter o tamanho da resposta
        let contentLength = 0;
        
        try {
          const headers = response.headers();
          if (headers['content-length']) {
            contentLength = parseInt(headers['content-length']);
          } else {
            // Se não tem content-length, tenta estimar pelo body
            try {
              const body = await response.body();
              contentLength = body.length;
            } catch (bodyError) {
              // Estimativa baseada no tipo de recurso
              contentLength = monitor.estimateSize(resourceType, url);
            }
          }
        } catch (headerError) {
          contentLength = monitor.estimateSize(resourceType, url);
        }

        // Adiciona ao total
        monitor.sessionData.totalBytes += contentLength;

        // Categoriza por tipo de recurso
        switch (resourceType) {
          case 'image':
            monitor.sessionData.imageBytes += contentLength;
            break;
          case 'script':
            monitor.sessionData.scriptBytes += contentLength;
            break;
          case 'stylesheet':
            monitor.sessionData.stylesheetBytes += contentLength;
            break;
          case 'document':
            monitor.sessionData.documentBytes += contentLength;
            break;
          default:
            monitor.sessionData.otherBytes += contentLength;
        }

        if (config.debug && contentLength > 10000) { // Log apenas arquivos > 10KB
          console.log(`📊 ${resourceType}: ${(contentLength / 1024).toFixed(1)}KB - ${url.slice(0, 60)}...`);
        }

      } catch (error) {
        // Ignora erros de monitoramento
      }
    });
  }

  /**
   * Estima o tamanho baseado no tipo de recurso
   * @param {string} resourceType - Tipo do recurso
   * @param {string} url - URL do recurso
   * @returns {number} - Tamanho estimado em bytes
   */
  estimateSize(resourceType, url) {
    // Estimativas baseadas em médias reais
    const estimates = {
      'document': 50000,      // 50KB para HTML
      'script': 100000,       // 100KB para JS
      'stylesheet': 30000,    // 30KB para CSS
      'image': 150000,        // 150KB para imagens
      'font': 80000,          // 80KB para fontes
      'xhr': 5000,            // 5KB para AJAX
      'fetch': 5000,          // 5KB para fetch
      'other': 10000          // 10KB para outros
    };

    // Ajustes baseados na URL
    if (url.includes('google') || url.includes('facebook')) {
      return estimates[resourceType] || estimates.other;
    }

    if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) {
      return estimates.image;
    }

    if (url.includes('.js')) {
      return estimates.script;
    }

    if (url.includes('.css')) {
      return estimates.stylesheet;
    }

    return estimates[resourceType] || estimates.other;
  }

  /**
   * Gera relatório de consumo
   * @param {number} simulationIndex - Índice da simulação
   * @param {boolean} debug - Se deve mostrar debug
   * @returns {Object} - Dados de consumo
   */
  generateReport(simulationIndex, debug = false) {
    const duration = Date.now() - this.sessionData.startTime;
    const totalMB = this.sessionData.totalBytes / (1024 * 1024);
    
    const report = {
      simulationIndex,
      duration: Math.round(duration / 1000), // em segundos
      totalBytes: this.sessionData.totalBytes,
      totalMB: parseFloat(totalMB.toFixed(2)),
      requestCount: this.sessionData.requestCount,
      responseCount: this.sessionData.responseCount,
      breakdown: {
        documents: parseFloat((this.sessionData.documentBytes / (1024 * 1024)).toFixed(2)),
        scripts: parseFloat((this.sessionData.scriptBytes / (1024 * 1024)).toFixed(2)),
        stylesheets: parseFloat((this.sessionData.stylesheetBytes / (1024 * 1024)).toFixed(2)),
        images: parseFloat((this.sessionData.imageBytes / (1024 * 1024)).toFixed(2)),
        other: parseFloat((this.sessionData.otherBytes / (1024 * 1024)).toFixed(2))
      }
    };

    if (debug) {
      console.log(`📊 Simulação #${simulationIndex} - Consumo de Dados:`);
      console.log(`   💾 Total: ${report.totalMB}MB`);
      console.log(`   📄 HTML: ${report.breakdown.documents}MB`);
      console.log(`   📜 JS: ${report.breakdown.scripts}MB`);
      console.log(`   🎨 CSS: ${report.breakdown.stylesheets}MB`);
      console.log(`   🖼️ Imagens: ${report.breakdown.images}MB`);
      console.log(`   📦 Outros: ${report.breakdown.other}MB`);
      console.log(`   🔢 Requisições: ${report.requestCount}`);
      console.log(`   ⏱️ Duração: ${report.duration}s`);
    }

    return report;
  }

  /**
   * Reset dos dados para nova simulação
   */
  reset() {
    this.sessionData = {
      totalBytes: 0,
      requestCount: 0,
      responseCount: 0,
      imageBytes: 0,
      scriptBytes: 0,
      stylesheetBytes: 0,
      documentBytes: 0,
      otherBytes: 0,
      startTime: Date.now(),
      requests: []
    };
  }
}

/**
 * Classe para agregar dados de múltiplas simulações
 */
class DataAggregator {
  constructor() {
    this.reports = [];
  }

  /**
   * Adiciona um relatório
   * @param {Object} report - Relatório de uma simulação
   */
  addReport(report) {
    this.reports.push(report);
  }

  /**
   * Gera estatísticas agregadas
   * @returns {Object} - Estatísticas consolidadas
   */
  getAggregatedStats() {
    if (this.reports.length === 0) {
      return null;
    }

    const totalMB = this.reports.reduce((sum, r) => sum + r.totalMB, 0);
    const avgMB = totalMB / this.reports.length;
    const maxMB = Math.max(...this.reports.map(r => r.totalMB));
    const minMB = Math.min(...this.reports.map(r => r.totalMB));
    
    const totalRequests = this.reports.reduce((sum, r) => sum + r.requestCount, 0);
    const avgRequests = totalRequests / this.reports.length;

    const avgDuration = this.reports.reduce((sum, r) => sum + r.duration, 0) / this.reports.length;

    return {
      totalSimulations: this.reports.length,
      totalDataMB: parseFloat(totalMB.toFixed(2)),
      averagePerSimulationMB: parseFloat(avgMB.toFixed(2)),
      maxPerSimulationMB: parseFloat(maxMB.toFixed(2)),
      minPerSimulationMB: parseFloat(minMB.toFixed(2)),
      totalRequests,
      averageRequests: Math.round(avgRequests),
      averageDuration: Math.round(avgDuration),
      estimatedCostPer1000: this.calculateCost(avgMB * 1000),
      projections: {
        per100: parseFloat((avgMB * 100).toFixed(2)),
        per1000: parseFloat((avgMB * 1000).toFixed(2)),
        per10000: parseFloat((avgMB * 10000).toFixed(2))
      }
    };
  }

  /**
   * Calcula custo estimado baseado no consumo
   * @param {number} totalMB - Total em MB
   * @returns {Object} - Custos estimados
   */
  calculateCost(totalMB) {
    // Preços aproximados por GB
    const prices = {
      proxyCheap: 2.5,      // $2.5/GB
      iproyal: 7,           // $7/GB
      brightData: 12.5      // $12.5/GB
    };

    const totalGB = totalMB / 1024;

    return {
      proxyCheap: parseFloat((totalGB * prices.proxyCheap).toFixed(2)),
      iproyal: parseFloat((totalGB * prices.iproyal).toFixed(2)),
      brightData: parseFloat((totalGB * prices.brightData).toFixed(2))
    };
  }

  /**
   * Exibe relatório final
   */
  displayFinalReport() {
    const stats = this.getAggregatedStats();
    
    if (!stats) {
      console.log('📊 Nenhum dado de consumo coletado');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RELATÓRIO DE CONSUMO DE DADOS');
    console.log('='.repeat(70));
    
    console.log(`📈 Simulações analisadas: ${stats.totalSimulations}`);
    console.log(`💾 Consumo total: ${stats.totalDataMB}MB`);
    console.log(`📊 Média por simulação: ${stats.averagePerSimulationMB}MB`);
    console.log(`📈 Máximo: ${stats.maxPerSimulationMB}MB | Mínimo: ${stats.minPerSimulationMB}MB`);
    console.log(`🔢 Média de requisições: ${stats.averageRequests}`);
    console.log(`⏱️ Duração média: ${stats.averageDuration}s`);
    
    console.log('\n📊 PROJEÇÕES DE CONSUMO:');
    console.log(`   100 simulações: ${stats.projections.per100}MB`);
    console.log(`   1.000 simulações: ${stats.projections.per1000}MB (${(stats.projections.per1000/1024).toFixed(2)}GB)`);
    console.log(`   10.000 simulações: ${stats.projections.per10000}MB (${(stats.projections.per10000/1024).toFixed(2)}GB)`);
    
    console.log('\n💰 CUSTO ESTIMADO PARA 1.000 SIMULAÇÕES:');
    const costs = this.calculateCost(stats.projections.per1000);
    console.log(`   Proxy-Cheap: $${costs.proxyCheap} (R$ ${(costs.proxyCheap * 5.5).toFixed(2)})`);
    console.log(`   IPRoyal: $${costs.iproyal} (R$ ${(costs.iproyal * 5.5).toFixed(2)})`);
    console.log(`   Bright Data: $${costs.brightData} (R$ ${(costs.brightData * 5.5).toFixed(2)})`);
    
    console.log('='.repeat(70));
  }
}

module.exports = {
  DataConsumptionMonitor,
  DataAggregator
};