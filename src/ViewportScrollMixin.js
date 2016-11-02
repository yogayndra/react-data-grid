import ColumnUtils from './ColumnUtils';
const React = require('react');
const ReactDOM = require('react-dom');
const DOMMetrics = require('./DOMMetrics');
const min = Math.min;
const max = Math.max;
const floor = Math.floor;
const ceil = Math.ceil;

type ViewportScrollState = {
  displayStart: number;
  displayEnd: number;
  height: number;
  scrollTop: number;
  scrollLeft: number;
};

module.exports = {
  mixins: [DOMMetrics.MetricsMixin],

  DOMMetrics: {
    viewportHeight(): number {
      return ReactDOM.findDOMNode(this).offsetHeight;
    },
    viewportWidth(): number {
      return ReactDOM.findDOMNode(this).offsetWidth;
    }
  },

  propTypes: {
    rowHeight: React.PropTypes.number,
    rowsCount: React.PropTypes.number.isRequired
  },

  getDefaultProps(): { rowHeight: number } {
    return {
      rowHeight: 30
    };
  },

  getInitialState(): ViewportScrollState {
    return this.getGridState(this.props);
  },

  getGridState(props: { rowHeight: number; rowsCount: number; minHeight: number }): ViewportScrollState {
    let totalNumberColumns = ColumnUtils.getSize(this.props.columnMetrics.columns);
    let canvasHeight = props.minHeight - props.rowOffsetHeight;
    let renderedRowsCount = ceil((props.minHeight - props.rowHeight) / props.rowHeight);
    let totalRowCount = min(renderedRowsCount * 4, props.rowsCount);
    return {
      displayStart: 0,
      displayEnd: totalRowCount,
      visibleStart: 0,
      visibleEnd: totalRowCount,
      height: canvasHeight,
      scrollTop: 0,
      scrollLeft: 0,
      colVisibleStart: 0,
      colVisibleEnd: totalNumberColumns,
      colDisplayStart: 0,
      colDisplayEnd: totalNumberColumns
    };
  },

  getRenderedColumnCount(displayStart, width) {
    let remainingWidth = width > 0 ? width : this.props.columnMetrics.totalWidth;
    if (remainingWidth === 0) {
      remainingWidth = ReactDOM.findDOMNode(this).offsetWidth;
    }
    let columnIndex = displayStart;
    let columnCount = 0;
    while (remainingWidth > 0) {
      let column = ColumnUtils.getColumn(this.props.columnMetrics.columns, columnIndex);

      if (!column) {
        break;
      }

      columnCount++;
      columnIndex++;
      remainingWidth -= column.width;
    }
    return columnCount;
  },

  getVisibleColStart(scrollLeft) {
    let remainingScroll = scrollLeft;
    let columnIndex = -1;
    while (remainingScroll >= 0) {
      columnIndex++;
      remainingScroll -= ColumnUtils.getColumn(this.props.columnMetrics.columns, columnIndex).width;
    }
    return columnIndex;
  },

  resetScrollStateAfterDelay() {
    if (this.resetScrollStateTimeoutId) {
      clearTimeout(this.resetScrollStateTimeoutId);
    }

    this.resetScrollStateTimeoutId = setTimeout(
      this.resetScrollStateAfterDelayCallback,
      500
    );
  },

  resetScrollStateAfterDelayCallback() {
    this.resetScrollStateTimeoutId = null;
    this.setState({
      isScrolling: false
    });
  },

  updateScroll(scrollTop: number, scrollLeft: number, height: number, rowHeight: number, length: number, width) {
    let isScrolling = true;
    this.resetScrollStateAfterDelay();
    let visibleBuffer = 2;
    let displayBuffer = 1.5;
    let renderedRowsCount = ceil(height / rowHeight);

    let visibleStart = max(0, floor(scrollTop / rowHeight) - visibleBuffer);

    let visibleEnd = min(
      visibleStart + renderedRowsCount + visibleBuffer,
      length);

    let displayStart = max(
      0,
      visibleStart - parseInt(renderedRowsCount * visibleBuffer, 10));

    let displayEnd = min(
      visibleStart + parseInt(renderedRowsCount * visibleBuffer, 10),
      length);

    let totalNumberColumns = ColumnUtils.getSize(this.props.columnMetrics.columns);
    let colVisibleStart = this.getVisibleColStart(scrollLeft);
    let renderedColumnCount = this.getRenderedColumnCount(colVisibleStart, width);
    let colVisibleEnd = colVisibleStart + renderedColumnCount;
    let colDisplayStart = max(0, colVisibleStart - 2);
    let colDisplayEnd = min(colVisibleStart + parseInt(renderedColumnCount * displayBuffer, 10), totalNumberColumns);

    let nextScrollState = {
      visibleStart,
      visibleEnd,
      displayStart,
      displayEnd,
      height,
      scrollTop,
      scrollLeft,
      colVisibleStart,
      colVisibleEnd,
      colDisplayStart,
      colDisplayEnd,
      isScrolling
    };

    this.setState(nextScrollState);
  },

  metricsUpdated() {
    let height = this.DOMMetrics.viewportHeight();
    let width = this.DOMMetrics.viewportWidth();
    if (height) {
      this.updateScroll(
        this.state.scrollTop,
        this.state.scrollLeft,
        height,
        this.props.rowHeight,
        this.props.rowsCount,
        width
      );
    }
  },

  componentWillReceiveProps(nextProps: { rowHeight: number; rowsCount: number, rowOffsetHeight: number }) {
    if (this.props.rowHeight !== nextProps.rowHeight ||
      this.props.minHeight !== nextProps.minHeight) {
      this.setState(this.getGridState(nextProps));
    } else if (this.props.rowsCount !== nextProps.rowsCount) {
      this.updateScroll(
        this.state.scrollTop,
        this.state.scrollLeft,
        this.state.height,
        nextProps.rowHeight,
        nextProps.rowsCount
      );
      // Added to fix the hiding of the bottom scrollbar when showing the filters.
    } else if (this.props.rowOffsetHeight !== nextProps.rowOffsetHeight) {
      // The value of height can be positive or negative and will be added to the current height to cater for changes in the header height (due to the filer)
      let height = this.props.rowOffsetHeight - nextProps.rowOffsetHeight;

      this.updateScroll(
        this.state.scrollTop,
        this.state.scrollLeft,
        this.state.height + height,
        nextProps.rowHeight,
        nextProps.rowsCount
      );
    }
  }
};
