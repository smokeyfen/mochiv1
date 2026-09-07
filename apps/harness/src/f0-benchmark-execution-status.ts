import {
  createF0BenchmarkExecutionDryReport,
  formatF0BenchmarkExecutionDryReport
} from './f0-benchmark-execution-packet';

const report = createF0BenchmarkExecutionDryReport();
console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : formatF0BenchmarkExecutionDryReport(report));
