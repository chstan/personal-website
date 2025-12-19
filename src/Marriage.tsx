/* Notes:
 * This section details the taxes affecting families in the United States
 * for the years 2019 and 2020. There are a few major components
 *
 * Earned Income Tax Credit
 *   The EITC is a benefit for <= moderate earners. You must make less than 55952 in 2019
 *   You must have a child that meets all of the criteria:
 *
 *
 *   or you can qualify without a child:
 *     20600
 *
 *  Neglects tax year investment income
  *
 *  References:
 *  Information on EITC
 *  https://www.cbpp.org/research/federal-tax/policy-basics-the-earned-income-tax-credit
 *
 *  Anonymized Tax Data
 *  https://www.irs.gov/statistics/soi-tax-stats-individual-statistical-tables-by-filing-status
 *
 */

import React from 'react';
import { format } from 'd3-format';
import { Group } from '@vx/vx';
import { interpolateRdBu, interpolateGreens } from 'd3-scale-chromatic';
import { scaleLinear, scaleThreshold } from '@vx/vx';
import { HeatmapRect } from '@vx/vx';
import { AxisLeft, AxisBottom } from '@vx/vx';
import { LegendQuantile, LegendItem, LegendLabel } from '@vx/vx';
import { Text } from '@vx/vx';

import Toggle from 'react-toggle';
import Select from 'react-select';
import {LabeledInputGroup, WrapLink} from "./common";

type Reference = {
  authors?: Array<string>;
  organization?: string;
  url: string;
  documentTitle: string;
  documentPublishDate: string;
};

const BibCite: React.FC<{index: number,}> = ({index,}) =>
  <a href={`#reference-${index}`} className="bibliography-inline-citation">[{index + 1}]</a>;

const BibItem: React.FC<{reference: Reference, index: number}> = ({reference, index}) => {
  let combinedAuthors = reference.organization;
  if (typeof(reference.authors) !== 'undefined') {
    combinedAuthors = reference.authors.join(', ')
  }
  return (
    <li key={index} id={`reference-${index}`}>
      <p>
        {combinedAuthors}, <strong>{reference.documentTitle}</strong>.&nbsp;
        <span className="date">{reference.documentPublishDate}</span>,&nbsp;
        <WrapLink to={reference.url}>External Link</WrapLink>.
      </p>
    </li>
  );
};

const Bibliography: React.FC<{references: Array<Reference>}> = ({references,}) =>
  <div className="bibliography">
    <header className="bibliography-header">References</header>
    <ol className="bibliography-contents">
      {references.map((r, i) => <BibItem reference={r} index={i} />)}
    </ol>
  </div>;

const range = (n: number) => {
  const r: Array<number> = [];
  let i = 0;
  while (i < n) {
    r.push(i);
    i++;
  }
  return r;
};

// utils
const max = (data: any, value = (d: any) => d) => Math.max(...data.map(value));
const min = (data: any, value = (d: any) => d) => Math.min(...data.map(value));

const N_POINTS = 51;
const INCOMES = range(N_POINTS).map(x => x * 5000);
const INCOME_SHARES = range(N_POINTS).map(x => x * 0.5 / (N_POINTS - 1));

enum FilingStatus {
  SINGLE = 'Single',
  HEAD_OF_HOUSEHOLD = 'Head of Household',
  MARRIED = 'Married',
  SEPARATELY = 'Filing Separately',
}

enum EITCChildren {
  NO_CHILDREN = 'No Children',
  ONE_CHILD = 'One Child',
  TWO_CHILDREN = 'Two Children',
  MORE_CHILDREN = 'Three or More Children'
}

type EITCParameters = {
  cap: number;
  phaseoutStart: number;
  phaseoutStartSingle: number;
  phaseoutFinished: number;
  phaseoutFinishedSingle: number;
  phaseinFinished: number;
}

type TaxYear = '2019' | '2020';

const noEITC: EITCParameters = {
  cap: 0, phaseinFinished: Infinity, phaseoutStart: Infinity, phaseoutFinished: 0,
  phaseoutStartSingle: Infinity, phaseoutFinishedSingle: Infinity,
};

const eitc2019 = new Map([
  [EITCChildren.NO_CHILDREN, { cap: 529, phaseinFinished: 6920, phaseoutStartSingle: 8650, phaseoutFinishedSingle: 15570, phaseoutStart: 14450, phaseoutFinished: 21370, }],
  [EITCChildren.ONE_CHILD, { cap: 3526, phaseinFinished: 10370, phaseoutStartSingle: 19030, phaseoutFinishedSingle: 41094, phaseoutStart: 24820, phaseoutFinished: 46884, }],
  [EITCChildren.TWO_CHILDREN, { cap: 5828, phaseinFinished: 14570, phaseoutStartSingle: 19030, phaseoutFinishedSingle: 46703, phaseoutStart: 24820, phaseoutFinished: 52493 }],
  [EITCChildren.MORE_CHILDREN, { cap: 6557, phaseinFinished: 14570, phaseoutStartSingle: 19030, phaseoutFinishedSingle: 50162, phaseoutStart: 24820, phaseoutFinished: 55592 }],
]) as Map<EITCChildren, EITCParameters>;

// phaseins here are set equal to those for 2019 because I could not find them!
const eitc2020 = new Map([
  [EITCChildren.NO_CHILDREN, { cap: 538, phaseinFinished: 6920, phaseoutStartSingle: 8790, phaseoutFinishedSingle: 15820, phaseoutStart: 14680, phaseoutFinished: 21710, }],
  [EITCChildren.ONE_CHILD, { cap: 3584, phaseinFinished: 10370, phaseoutStartSingle: 19330, phaseoutFinishedSingle: 41756, phaseoutStart: 25220, phaseoutFinished: 47646, }],
  [EITCChildren.TWO_CHILDREN, { cap: 5920, phaseinFinished: 14570, phaseoutStartSingle: 19330, phaseoutFinishedSingle: 47440, phaseoutStart: 25220, phaseoutFinished: 53300 }],
  [EITCChildren.MORE_CHILDREN, { cap: 6660, phaseinFinished: 14570, phaseoutStartSingle: 19330, phaseoutFinishedSingle: 50954, phaseoutStart: 25220, phaseoutFinished: 56844 }],
]);

type Bracket = Array<Array<number>>;

// Earned income tax credit (DONE)
// Alternative minimum tax (SKIP but note, very few americans pay it)
// payroll taxes ()
// standard deductions
// personal exemptions -> eliminated by TCJA

const standardDeduction2019 = new Map([
  [FilingStatus.SINGLE, 12200],
  [FilingStatus.HEAD_OF_HOUSEHOLD, 18350],
  [FilingStatus.MARRIED, 24400],
  [FilingStatus.SEPARATELY, 12200],
]) as Map<FilingStatus, number>;

const standardDeduction2020 = new Map([
  [FilingStatus.SINGLE, 12400],
  [FilingStatus.HEAD_OF_HOUSEHOLD, 18650],
  [FilingStatus.MARRIED, 24800],
  [FilingStatus.SEPARATELY, 12400],
]) as Map<FilingStatus, number>;

const BRACKET_RATES = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
const BRACKETS_SINGLE_2019 = [9700, 39475, 84200, 160725, 204100, 510300, Infinity];
const BRACKETS_HEAD_2019 = [13850, 52850, 84200, 160700, 204100, 510300, Infinity];
const BRACKETS_MARRIED_2019 = [19400, 78950, 168400, 321450, 408200, 612350, Infinity];
const BRACKETS_SEPARATELY_2019 = [9700, 39475, 84200, 160725, 204100, 306175, Infinity];

const BRACKETS_SINGLE_2020 = [9875, 40125, 85525, 163300, 207350, 518400, Infinity];
const BRACKETS_HEAD_2020 = [14100, 53700, 85500, 163300, 207350, 518400, Infinity];
const BRACKETS_MARRIED_2020 = [19750, 80250, 171050, 326600, 414700, 622050, Infinity];
const BRACKETS_SEPARATELY_2020 = [9875, 40125, 85525, 163300, 207350, 311025, Infinity];

const buildBracket = (bracket: Array<number>) =>
  BRACKET_RATES.map((rate, i) => [bracket[i], rate]);

const noBracket = buildBracket(BRACKETS_SINGLE_2019);
const brackets2019 = new Map([
  [FilingStatus.SINGLE, buildBracket(BRACKETS_SINGLE_2019)],
  [FilingStatus.HEAD_OF_HOUSEHOLD, buildBracket(BRACKETS_HEAD_2019)],
  [FilingStatus.MARRIED, buildBracket(BRACKETS_MARRIED_2019)],
  [FilingStatus.SEPARATELY, buildBracket(BRACKETS_SEPARATELY_2019)],
]) as Map<FilingStatus, Bracket>;

const brackets2020 = new Map([
  [FilingStatus.SINGLE, buildBracket(BRACKETS_SINGLE_2020)],
  [FilingStatus.HEAD_OF_HOUSEHOLD, buildBracket(BRACKETS_HEAD_2020)],
  [FilingStatus.MARRIED, buildBracket(BRACKETS_MARRIED_2020)],
  [FilingStatus.SEPARATELY, buildBracket(BRACKETS_SEPARATELY_2020)],
]) as Map<FilingStatus, Bracket>;

const interp = (start: number, end: number, value: number) => (start - value) / (start - end);
const calcEITCFromParameters = (income: number, agi: number, cap: number, phaseinFinished: number, phaseoutStart: number, phaseoutFinished: number) => {
  if (income > phaseoutFinished || agi > phaseoutFinished) return 0;
  if (income > phaseoutStart) return (1 - interp(phaseoutStart, phaseoutFinished, income)) * cap;
  if (income > phaseinFinished) return cap;
  return interp(0, phaseinFinished, income) * cap;
};

const calcEITC = (filingStatus: FilingStatus, income: number, agi: number, children: EITCChildren, year: TaxYear) => {
  const table = year === '2019' ? eitc2019 : eitc2020;
  const {cap, phaseinFinished, ...p} = table.get(children) || noEITC;

  if (filingStatus === FilingStatus.MARRIED) {
    return calcEITCFromParameters(income, agi, cap, phaseinFinished, p.phaseoutStart, p.phaseoutFinished);
  } else {
    return calcEITCFromParameters(income, agi, cap, phaseinFinished, p.phaseoutStartSingle, p.phaseoutFinishedSingle);
  }
};

const calculateStandardDeduction = (filingStatus: FilingStatus, year: TaxYear) => {
  const deductions = year === '2019' ? standardDeduction2019 : standardDeduction2020;
  return deductions.get(filingStatus) || 0;
};

const calcTaxFromBrackets = (filingStatus: FilingStatus, agi: number, year: TaxYear) => {
  if (agi < 0.1) return 0;

  const bracketsYear = year === '2019' ? brackets2019 : brackets2020;
  const brackets = bracketsYear.get(filingStatus) || noBracket;

  let remainingAgi = agi;
  let due = 0.0;
  let bracketStart = 0;
  for (let [bracketEnd, rate] of brackets) {
    let agiInBracket = Math.min(remainingAgi, bracketEnd - bracketStart);

    due += rate * agiInBracket;
    remainingAgi = remainingAgi - agiInBracket;

    if (remainingAgi < 0.1) break;

    bracketStart = bracketEnd;
  }

  return due;
};

const calculateTaxes = (
  filingStatus: FilingStatus,
  incomeSplitPerc: number, income: number,
  children: EITCChildren, year: TaxYear,
) => {
  /* There are a few things to considere, we are interested in comparing primarily the
   * tax rates of married filers to single filers. If children are involved, one filer
   * can claim head of household, so we special case that below
   *
   */

  const deduction = calculateStandardDeduction(filingStatus, year);
  let taxes = 0, eitcRebate = 0;

  if (filingStatus === FilingStatus.MARRIED) {
    taxes = calcTaxFromBrackets(filingStatus, income - deduction, year);
    eitcRebate = calcEITC(filingStatus, income, income - deduction, children, year);
  } else { // single, HoH, separately
    taxes = (
      calcTaxFromBrackets(filingStatus, (income * incomeSplitPerc) - deduction, year) +
      calcTaxFromBrackets(filingStatus, (income * (1 - incomeSplitPerc)) - deduction, year)
    );

    if (filingStatus === FilingStatus.HEAD_OF_HOUSEHOLD) {
      const hasChildrenFilingStatus = children === EITCChildren.NO_CHILDREN ? FilingStatus.SINGLE : FilingStatus.HEAD_OF_HOUSEHOLD;
      const incA = income * incomeSplitPerc;
      const incB = income - incA;

      const eitcRebateA = (
        calcEITC(hasChildrenFilingStatus, incA, incA - deduction, children, year) +
        calcEITC(FilingStatus.SINGLE, incB, incB - deduction, EITCChildren.NO_CHILDREN, year)
      );
      const eitcRebateB = (
        calcEITC(hasChildrenFilingStatus, incB, incB - deduction, children, year) +
        calcEITC(FilingStatus.SINGLE, incA, incA - deduction, EITCChildren.NO_CHILDREN, year)
      );
      eitcRebate = eitcRebateB > eitcRebateA ? eitcRebateB : eitcRebateA;
    }
  }

  return taxes - eitcRebate;
};

const MARGIN = 80;
const STATIC_CONFIG = {
  width: 400 + MARGIN * 2,
  height: 400 + MARGIN * 2,
  margin: MARGIN,
};

const TAX_FILING_OPTIONS = [
  { value: FilingStatus.SINGLE, label: 'Single', },
  { value: FilingStatus.MARRIED, label: 'Married', },
  { value: FilingStatus.SEPARATELY, label: 'Filing Separately', },
  { value: FilingStatus.HEAD_OF_HOUSEHOLD, label: 'Head of Household', },
];

const TAX_YEAR_OPTIONS = [
  { value: '2019', label: '2019-2020', },
  { value: '2020', label: '2020-2021', },
];

const TAX_CHILDREN_OPTIONS = [
  { value: EITCChildren.NO_CHILDREN, label: 'No Children' },
  { value: EITCChildren.ONE_CHILD, label: 'One Child' },
  { value: EITCChildren.TWO_CHILDREN, label: 'Two Children' },
  { value: EITCChildren.MORE_CHILDREN, label: 'Three or More Children' },
];


const optionFor = (value: any, options: any) => {
  for (let option of options) {
    if (option.value === value) return option;
  }
  return '';
};

type TaxSettings = {
  filingStatus: FilingStatus;
  children: EITCChildren;
  year: TaxYear;
}

type ComparisonDiagramProps = {
  a: TaxSettings;
  b: TaxSettings;
  useAbsoluteAmounts: boolean;
  useEITC: boolean;
  onClickCell: any;
  config: {
    width: number,
    height: number,
    margin: number,
  }
}
const ComparisonDiagram: React.FC<ComparisonDiagramProps> = ({a, b, ...props}) => {
  const taxData: Array<Object> = [];
  for (let income of INCOMES) {
    let working = [];
    for (let incomeShare of INCOME_SHARES) {
      const taxesDueA = calculateTaxes(
        a.filingStatus,
        incomeShare,
        income,
        a.children, '2019'
      );
      const taxesDueB = calculateTaxes(
        b.filingStatus,
        incomeShare,
        income,
        b.children, '2019'
      );
      if (props.useAbsoluteAmounts) {
        working.push({bin: incomeShare, count: (taxesDueA - taxesDueB) / 1000});
      } else {
        working.push({bin: incomeShare, count: 100 * (taxesDueA - taxesDueB) / income});
      }

    }
    taxData.push({ bin: income, bins: working });
  }

  const size =  props.config.width - 2 * props.config.margin;
  const xMax = size;
  const yMax = props.config.height - 2 * props.config.margin;
  const binWidth = xMax / taxData.length;

  // accessors
  const bins = (d: any) => d.bins;
  const count = (d: any) => d.count || 0;
  const absCount = (d: any) => Math.abs(d.count) || 0;

  const colorMax = max(taxData, d => max(bins(d), absCount));
  const bucketSizeMax = max(taxData, d => bins(d).length);

  // scales
  const xScale = scaleLinear({
    domain: [0, INCOMES.length],
  });
  const yScale = scaleLinear({
    domain: [0, bucketSizeMax]
  });

  const DOMAIN = [-1, -2./3, -1./3, 0, 1./3, 2./3, 1];
  const LEGEND_DOMAIN = [-1., -2./3, -1./3, 0, 1./3, 2./3, 1];
  const colorScaleComp = (x: number) => interpolateRdBu((x / colorMax + 0.5));
  const colorScaleRaw = (x: number) => interpolateGreens(x / 10000);

  let colorScale = colorScaleComp;

  const legendColorScale = scaleThreshold({
    domain: LEGEND_DOMAIN.map(x => x * colorMax),
    range: LEGEND_DOMAIN.map((x) => {
        return interpolateRdBu((x + 1) / 2);
      }
    ),
  });

  xScale.range([0, xMax]);
  yScale.range([yMax, 0]);

  let title;
  let legend;
  if (props.useAbsoluteAmounts) {
    title = 'Marriage Tax Diagram ($k Δ)';
    legend = (
      <div className="legend">
        <div className="title">Income Change ($k)</div>
        <LegendQuantile scale={legendColorScale as any}>
          {labels => {
            return labels.filter((label: any) => typeof(label.extent[0]) !== 'undefined').map((label: any, i) => {
              const fmt = format('.2f');
              const [low, high] = label.extent;
              const size = 16;
              return (
                <LegendItem key={`legend-${i}`}>
                  <svg width={size} height={size} style={{ margin: '2px 0' }}>
                    <rect fill={label.value as any}
                          width={size} height={size} />
                  </svg>
                  <LegendLabel align={'left'} margin={'0 1rem'}>
                    {fmt(low)} to {fmt(high)}
                  </LegendLabel>
                </LegendItem>
              );
            });
          }}
        </LegendQuantile>
      </div>
    );
  } else {
    title = 'Marriage Tax Diagram (% Δ)';
    legend = (
      <div className="legend">
        <div className="title">Income Change (%)</div>
        <LegendQuantile scale={legendColorScale as any}>
          {labels => {
            return labels.filter((label: any) => typeof(label.extent[0]) !== 'undefined').map((label: any, i) => {
              const fmt = format('.2f');
              const [low, high] = label.extent;
              const size = 16;
              return (
                <LegendItem key={`legend-${i}`}>
                  <svg width={size} height={size} style={{ margin: '2px 0' }}>
                    <rect fill={label.value as any}
                          width={size} height={size} />
                  </svg>
                  <LegendLabel align={'left'} margin={'0 1rem'}>
                    {fmt(low)}% to {fmt(high)}%
                  </LegendLabel>
                </LegendItem>
              );
            });
          }}
        </LegendQuantile>
      </div>
    );
  }

  return (
    <div>
      <svg width={props.config.width} height={props.config.height}>
        <Group top={props.config.margin} left={props.config.margin}>
          <Text
            verticalAnchor="start"
            textAnchor="middle"
            dx={size / 2}
            dy={-20}
            style={{fontSize: '24px', fontFamily: 'Source Sans Pro, Roboto'}}
          >{title as any}</Text>
          <AxisLeft
            top={3.5}
            scale={yScale as any}
            numTicks={11}
            label="(Single Income) ← Income % of Less-Earning Partner → (Equal Earning)"
            labelProps={{
              fill: 'rgb(50, 50, 50)',
              textAnchor: 'middle',
              fontSize: 14,
              fontFamily: 'Source Sans Pro, Roboto'
            }}
            stroke="rgb(50, 50, 50)"
            tickStroke="rgb(50, 50, 50)"
            tickLabelProps={(value, index) => ({
              fill: 'rgb(50, 50, 50)',
              textAnchor: 'end',
              fontSize: 10,
              fontFamily: 'Source Sans Pro, Roboto',
              dx: '-0.5em',
              dy: '0.25em'
            })}
            tickComponent={({ formattedValue, ...tickProps }) =>
              <text {...tickProps}>{100 * INCOME_SHARES[parseInt(formattedValue as any) || 0]}%</text>
            }
          />
          <AxisBottom
            top={size + 4}
            scale={xScale as any}
            numTicks={11}
            label={'Combined Income ($1,000s)'}
            labelProps={{
              fill: 'rgb(50, 50, 50)',
              textAnchor: 'middle',
              fontSize: 14,
              fontFamily: 'Source Sans Pro, Roboto',
            }}
            stroke="rgb(50, 50, 50)"
            tickStroke="rgb(50, 50, 50)"
            tickLabelProps={(value, index) => ({
              fill: 'rgb(50, 50, 50)',
              textAnchor: 'middle',
              fontSize: 10,
              fontFamily: 'Source Sans Pro, Roboto',
              dx: '0',
              dy: '0',
            })}
            tickComponent={({ formattedValue, ...tickProps }) =>
              <text {...tickProps}>{INCOMES[parseInt(formattedValue as any) || 0] / 1000}</text>
            }
          />
          <HeatmapRect
            data={taxData}
            xScale={xScale as any}
            yScale={yScale as any}
            colorScale={colorScale as any}
            opacity={1}
            binWidth={binWidth}
            binHeight={binWidth}
            gap={-0.25}
          >
            {heatmap => {
              return heatmap.map(bins => {
                return bins.map((bin: any) => {
                  return (
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="vx-heatmap-rect"
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      fill={bin.color}
                      fillOpacity={bin.opacity}
                      onClick={event => {
                        const { row, column } = bin;
                        props.onClickCell({ row, column, ...bin.bin });
                      }}
                    />
                  );
                });
              });
            }}
          </HeatmapRect>
        </Group>
      </svg>
      {legend}
    </div>
  );
};

const initialExplorerState = {
  useEITC: true,
  useAbsoluteAmounts: false,
  modalText: '',

  taxOptionsA: {
    filingStatus: FilingStatus.SINGLE,
    year: '2019',
    children: EITCChildren.NO_CHILDREN,
  } as TaxSettings,

  taxOptionsB: {
    filingStatus: FilingStatus.MARRIED,
    year: '2019',
    children: EITCChildren.NO_CHILDREN,
  } as TaxSettings,
};
type TaxExplorerState = Readonly<typeof initialExplorerState>;
class TaxExplorer extends React.Component<{}, TaxExplorerState> {
  readonly state: TaxExplorerState = initialExplorerState;

  toggleAbsolute = (e: any) => { this.setState({ useAbsoluteAmounts: e.target.checked }) };
  toggleEITC = (e: any) => { this.setState({ useEITC: e.target.checked }) };

  setOption = (option: string, key: string, v: any) => {
    const newState = JSON.parse(JSON.stringify(this.state)); // UGH... MY LIFE
    newState[option][key] = v.value;
    newState.modalText = '';
    this.setState(newState);
  };

  setAFilingStatus = (v: any) => this.setOption('taxOptionsA', 'filingStatus', v);
  setBFilingStatus = (v: any) => this.setOption('taxOptionsB', 'filingStatus', v);

  setAYear = (v: any) => this.setOption('taxOptionsA', 'year', v);
  setBYear = (v: any) => this.setOption('taxOptionsB', 'year', v);

  setAChildren = (v: any) => this.setOption('taxOptionsA', 'children', v);
  setBChildren = (v: any) => this.setOption('taxOptionsB', 'children', v);
  onClickCell = ({ row, column, count, }: any) => {
    const incomeShare = INCOME_SHARES[row];
    const income = INCOMES[column];
    const fmt = format('.1f');
    let deltaText;
    if (this.state.useAbsoluteAmounts) {
      deltaText = `${format('.2f')(count)} $k`;
    } else {
      deltaText = `${format('.1f')(count)}%`;
    }
    this.setState({
      modalText: `At a combined income of $${income} with ${fmt(incomeShare * 100)}% 
      share the change in taxes is ${deltaText}.`
    });
  };

  render() {
    return (
      <section id="tax-explorer">
        <div className="form" style={{ marginBottom: '2rem', }}>
          <header className="form-header">General Settings</header>
          <LabeledInputGroup label="Use Absolute ($k) Amounts">
            <Toggle icons={false}
                    defaultChecked={this.state.useAbsoluteAmounts}
                    onChange={this.toggleAbsolute}
            />
          </LabeledInputGroup>
          <LabeledInputGroup label="Use Earned Income Tax Credit">
            <Toggle icons={false} defaultChecked={this.state.useEITC} onChange={this.toggleEITC} />
          </LabeledInputGroup>
        </div>
        <div className="parallel-forms">
          <div>
            <div className="form">
              <header className="form-header">Baseline</header>
              <div>
                <Select
                  value={optionFor(this.state.taxOptionsA.filingStatus, TAX_FILING_OPTIONS)}
                  onChange={this.setAFilingStatus}
                  options={TAX_FILING_OPTIONS}
                />
              </div>
              <div>
                <Select
                  value={optionFor(this.state.taxOptionsA.year, TAX_YEAR_OPTIONS)}
                  onChange={this.setAYear}
                  options={TAX_YEAR_OPTIONS}
                />
              </div>
              <div>
                <Select
                  value={optionFor(this.state.taxOptionsA.children, TAX_CHILDREN_OPTIONS)}
                  onChange={this.setAChildren}
                  options={TAX_CHILDREN_OPTIONS}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="form">
              <header className="form-header">Comparison</header>
              <div>
                <Select
                  value={optionFor(this.state.taxOptionsB.filingStatus, TAX_FILING_OPTIONS)}
                  onChange={this.setBFilingStatus}
                  options={TAX_FILING_OPTIONS}
                />
              </div>
              <div>
                <Select
                  value={optionFor(this.state.taxOptionsB.year, TAX_YEAR_OPTIONS)}
                  onChange={this.setBYear}
                  options={TAX_YEAR_OPTIONS}
                />
              </div>
              <div>
                <Select
                  value={optionFor(this.state.taxOptionsB.children, TAX_CHILDREN_OPTIONS)}
                  onChange={this.setBChildren}
                  options={TAX_CHILDREN_OPTIONS}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="info-block">
          <header>At Clicked Point</header>
          <div className="content">
            {this.state.modalText || <span>&nbsp;</span>}
          </div>
        </div>
        <ComparisonDiagram
          a={this.state.taxOptionsA} b={this.state.taxOptionsB}
          useAbsoluteAmounts={this.state.useAbsoluteAmounts}
          useEITC={this.state.useEITC}
          onClickCell={this.onClickCell}
          config={STATIC_CONFIG}
        />
        <Bibliography references={[
          {
            authors: ['Center on Budget and Policy Priorities'],
            url: 'https://www.cbpp.org/research/federal-tax/policy-basics-the-earned-income-tax-credit',
            documentPublishDate: 'Dececember 10, 2019',
            documentTitle: 'Policy Basics: The Earned Income Tax Credit',
          },
          {
            authors: ['The Internal Revenue Service'],
            url: 'https://www.irs.gov/statistics/soi-tax-stats-individual-statistical-tables-by-filing-status',
            documentPublishDate: '(renewed continually) 2020',
            documentTitle: 'SOI Tax Stats - Individual Statistical Tables by Filing Status',
          },
        ]}/>
      </section>
    );
  }
}

const TaxExplorerPage = () =>
  <article>
    <header style={{marginBottom: '2rem', lineHeight: '2em'}}>
      <h1>Tax Consequences After Marriage</h1>
    </header>

    <TaxExplorer />
  </article>;

const SINGLE_NO_CHILDREN: TaxSettings = {
  year: '2019',
  children: EITCChildren.NO_CHILDREN,
  filingStatus: FilingStatus.SINGLE
};

const MARRIED_NO_CHILDREN: TaxSettings = {
  year: '2019',
  children: EITCChildren.NO_CHILDREN,
  filingStatus: FilingStatus.MARRIED
};

const ExampleMarriageDiagram = () => {
  return (
    <section className="example-marriage-diagram">
      <header className="lede">
        What do the tax consequences of marriage tell us about
        intentional design of the tax code?
      </header>
      <ComparisonDiagram
        a={SINGLE_NO_CHILDREN} b={MARRIED_NO_CHILDREN}
        useAbsoluteAmounts={false} useEITC={true}
        onClickCell={() => null}
        config={{
          width: 400,
          height: 400,
          margin: 60,
        }}
      />
    </section>
  );
};

export {
  TaxExplorerPage,
  ExampleMarriageDiagram,
}