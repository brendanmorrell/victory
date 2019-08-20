import React from "react";
import PropTypes from "prop-types";
import {
  PropTypes as CustomPropTypes,
  TextSize,
  Helpers,
  LabelHelpers,
  VictoryLabel,
  VictoryTheme,
  VictoryPortal
} from "victory-core";
import Flyout from "./flyout";
import { assign, defaults, uniqueId, isPlainObject, orderBy } from "lodash";

const fallbackProps = {
  cornerRadius: 5,
  pointerLength: 10,
  pointerWidth: 10
};

export default class VictoryTooltip extends React.Component {
  static displayName = "VictoryTooltip";

  static propTypes = {
    activateData: PropTypes.bool,
    active: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
    angle: PropTypes.number,
    center: PropTypes.shape({ x: CustomPropTypes.nonNegative, y: CustomPropTypes.nonNegative }),
    centerOffset: PropTypes.shape({
      x: PropTypes.oneOfType([PropTypes.number, PropTypes.func]),
      y: PropTypes.oneOfType([PropTypes.number, PropTypes.func])
    }),
    constrainToVisibleArea: PropTypes.bool,
    cornerRadius: PropTypes.oneOfType([CustomPropTypes.nonNegative, PropTypes.func]),
    data: PropTypes.array,
    datum: PropTypes.object,
    dx: PropTypes.oneOfType([PropTypes.number, PropTypes.func]),
    dy: PropTypes.oneOfType([PropTypes.number, PropTypes.func]),
    events: PropTypes.object,
    flyoutComponent: PropTypes.element,
    flyoutHeight: PropTypes.oneOfType([CustomPropTypes.nonNegative, PropTypes.func]),
    flyoutStyle: PropTypes.object,
    flyoutWidth: PropTypes.oneOfType([CustomPropTypes.nonNegative, PropTypes.func]),
    groupComponent: PropTypes.element,
    height: PropTypes.number,
    horizontal: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    index: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    labelComponent: PropTypes.element,
    orientation: PropTypes.oneOfType([
      PropTypes.oneOf(["top", "bottom", "left", "right"]),
      PropTypes.func
    ]),
    pointerLength: PropTypes.oneOfType([CustomPropTypes.nonNegative, PropTypes.func]),
    pointerWidth: PropTypes.oneOfType([CustomPropTypes.nonNegative, PropTypes.func]),
    polar: PropTypes.bool,
    renderInPortal: PropTypes.bool,
    scale: PropTypes.shape({
      x: CustomPropTypes.scale,
      y: CustomPropTypes.scale
    }),
    style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    text: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.func,
      PropTypes.array
    ]),
    theme: PropTypes.object,
    width: PropTypes.number,
    x: PropTypes.number,
    y: PropTypes.number
  };

  static defaultProps = {
    active: false,
    renderInPortal: true,
    labelComponent: <VictoryLabel />,
    flyoutComponent: <Flyout />,
    groupComponent: <g />
  };

  static defaultEvents = (props) => {
    return [
      {
        target: "data",
        eventHandlers: {
          onMouseOver: () => {
            return props.activateData
              ? [
                  { target: "labels", mutation: () => ({ active: true }) },
                  { target: "data", mutation: () => ({ active: true }) }
                ]
              : [{ target: "labels", mutation: () => ({ active: true }) }];
          },
          onTouchStart: () => {
            return props.activateData
              ? [
                  { target: "labels", mutation: () => ({ active: true }) },
                  { target: "data", mutation: () => ({ active: true }) }
                ]
              : [{ target: "labels", mutation: () => ({ active: true }) }];
          },
          onMouseOut: () => {
            return props.activateData
              ? [
                  { target: "labels", mutation: () => ({ active: undefined }) },
                  { target: "data", mutation: () => ({ active: undefined }) }
                ]
              : [{ target: "labels", mutation: () => ({ active: undefined }) }];
          },
          onTouchEnd: () => {
            return props.activateData
              ? [
                  { target: "labels", mutation: () => ({ active: undefined }) },
                  { target: "data", mutation: () => ({ active: undefined }) }
                ]
              : [{ target: "labels", mutation: () => ({ active: undefined }) }];
          }
        }
      }
    ];
  };

  constructor(props) {
    super(props);
    this.id = props.id === undefined ? uniqueId("tooltip-") : props.id;
  }

  getDefaultOrientation(props) {
    const { datum, horizontal, polar } = props;
    if (!polar) {
      const positive = horizontal ? "right" : "top";
      const negative = horizontal ? "left" : "bottom";
      return datum && datum.y < 0 ? negative : positive;
    } else {
      return this.getPolarOrientation(props, datum);
    }
  }

  getPolarOrientation(props, datum) {
    const degrees = LabelHelpers.getDegrees(props, datum);
    const placement = props.labelPlacement || "vertical";
    if (placement === " vertical") {
      return this.getVerticalOrientations(degrees);
    } else if (placement === "parallel") {
      return degrees < 90 || degrees > 270 ? "right" : "left";
    } else {
      return degrees > 180 ? "bottom" : "top";
    }
  }

  getVerticalOrientations(degrees) {
    // eslint-disable-next-line no-magic-numbers
    if (degrees < 45 || degrees > 315) {
      return "right";
      // eslint-disable-next-line no-magic-numbers
    } else if (degrees >= 45 && degrees <= 135) {
      return "top";
      // eslint-disable-next-line no-magic-numbers
    } else if (degrees > 135 && degrees < 225) {
      return "left";
    } else {
      return "bottom";
    }
  }

  getEvaluatedProps(props) {
    const {
      horizontal,
      pointerLength,
      pointerWidth,
      cornerRadius,
      flyoutWidth,
      flyoutHeight,
      dx,
      dy,
      text,
      active
    } = props;

    const style = Array.isArray(props.style)
      ? props.style.map((s) => Helpers.evaluateStyle(s, props))
      : Helpers.evaluateStyle(props.style, props);
    const flyoutStyle = Helpers.evaluateStyle(props.flyoutStyle, props);
    const padding = (flyoutStyle && flyoutStyle.padding) || 0;
    const defaultDx = horizontal ? padding : 0;
    const defaultDy = horizontal ? 0 : padding;
    const orientation =
      Helpers.evaluateProp(props.orientation, props) || this.getDefaultOrientation(props);
    return assign({}, props, {
      style,
      flyoutStyle,
      orientation,
      dx: dx !== undefined ? Helpers.evaluateProp(dx, props) : defaultDx,
      dy: dy !== undefined ? Helpers.evaluateProp(dy, props) : defaultDy,
      cornerRadius: Helpers.evaluateProp(cornerRadius, props),
      pointerLength: Helpers.evaluateProp(pointerLength, props),
      pointerWidth: Helpers.evaluateProp(pointerWidth, props),
      flyoutWidth: Helpers.evaluateProp(flyoutWidth, props),
      flyoutHeight: Helpers.evaluateProp(flyoutHeight, props),
      active: Helpers.evaluateProp(active, props),
      text: Helpers.evaluateProp(text, props)
    });
  }

  getCalculatedValues(props) {
    const { style, text } = props;
    const theme = props.theme || VictoryTheme.grayscale;
    const defaultLabelStyles =
      theme && theme.tooltip && theme.tooltip.style ? theme.tooltip.style : {};
    const baseLabelStyle = Array.isArray(style)
      ? style.map((s) => defaults({}, s, defaultLabelStyles))
      : defaults({}, style, defaultLabelStyles);
    const defaultFlyoutStyles =
      theme && theme.tooltip && theme.tooltip.flyoutStyle ? theme.tooltip.flyoutStyle : {};
    const flyoutStyle = props.flyoutStyle
      ? defaults({}, props.flyoutStyle, defaultFlyoutStyles)
      : defaultFlyoutStyles;
    const labelStyle = Array.isArray(baseLabelStyle)
      ? baseLabelStyle.map((s) => Helpers.evaluateStyle(s, props))
      : Helpers.evaluateStyle(baseLabelStyle, props);
    const labelSize = TextSize.approximateTextSize(text, labelStyle);
    const flyoutDimensions = this.getDimensions(props, labelSize, labelStyle);
    const flyoutCenter = this.getFlyoutCenter(props, flyoutDimensions);
    const transform = this.getTransform(props);
    return {
      labelStyle,
      flyoutStyle,
      labelSize,
      flyoutDimensions,
      flyoutCenter,
      transform
    };
  }

  getTransform(props) {
    const { x, y, style } = props;
    const labelStyle = style || {};
    const angle = labelStyle.angle || props.angle || this.getDefaultAngle(props);
    return angle ? `rotate(${angle} ${x} ${y})` : undefined;
  }

  // eslint-disable-next-line complexity
  getDefaultAngle(props) {
    const { polar, labelPlacement, orientation, datum } = props;
    if (!polar || !labelPlacement || labelPlacement === "vertical") {
      return 0;
    }
    const degrees = LabelHelpers.getDegrees(props, datum);
    const sign = (degrees > 90 && degrees < 180) || degrees > 270 ? 1 : -1;
    const labelRotation = labelPlacement === "perpendicular" ? 0 : 90;
    let angle;
    if (degrees === 0 || degrees === 180) {
      angle = orientation === "top" && degrees === 180 ? 270 : 90;
    } else if (degrees > 0 && degrees < 180) {
      angle = 90 - degrees;
    } else if (degrees > 180 && degrees < 360) {
      angle = 270 - degrees;
    }
    return angle + sign * labelRotation;
  }

  constrainTooltip(center, props, dimensions) {
    const { x, y } = center;
    const { width, height } = dimensions;
    const extent = {
      x: [0, props.width],
      y: [0, props.height]
    };
    const flyoutExtent = {
      x: [x - width / 2, x + width / 2],
      y: [y - height / 2, y + height / 2]
    };
    const adjustments = {
      x: [
        flyoutExtent.x[0] < extent.x[0] ? extent.x[0] - flyoutExtent.x[0] : 0,
        flyoutExtent.x[1] > extent.x[1] ? flyoutExtent.x[1] - extent.x[1] : 0
      ],
      y: [
        flyoutExtent.y[0] < extent.y[0] ? extent.y[0] - flyoutExtent.y[0] : 0,
        flyoutExtent.y[1] > extent.y[1] ? flyoutExtent.y[1] - extent.y[1] : 0
      ]
    };
    return {
      x: Math.round(x + adjustments.x[0] - adjustments.x[1]),
      y: Math.round(y + adjustments.y[0] - adjustments.y[1])
    };
  }

  // eslint-disable-next-line complexity
  getFlyoutCenter(props, dimensions) {
    const {
      x,
      y,
      dx,
      dy,
      pointerLength,
      orientation,
      constrainToVisibleArea,
      centerOffset
    } = props;
    const { height, width } = dimensions;
    const xSign = orientation === "left" ? -1 : 1;
    const ySign = orientation === "bottom" ? -1 : 1;
    const flyoutCenter = {
      x:
        orientation === "left" || orientation === "right"
          ? x + xSign * (pointerLength + width / 2 + xSign * dx)
          : x + dx,
      y:
        orientation === "top" || orientation === "bottom"
          ? y - ySign * (pointerLength + height / 2 - ySign * dy)
          : y + dy
    };

    const center = {
      x:
        isPlainObject(props.center) && props.center.x !== undefined
          ? props.center.x
          : flyoutCenter.x,
      y:
        isPlainObject(props.center) && props.center.y !== undefined
          ? props.center.y
          : flyoutCenter.y
    };

    const offsetX =
      isPlainObject(centerOffset) && centerOffset.x !== undefined
        ? Helpers.evaluateProp(centerOffset.x, props)
        : 0;

    const offsetY =
      isPlainObject(centerOffset) && centerOffset.y !== undefined
        ? Helpers.evaluateProp(centerOffset.y, props)
        : 0;

    const centerWithOffset = {
      x: center.x + offsetX,
      y: center.y + offsetY
    };

    return constrainToVisibleArea
      ? this.constrainTooltip(centerWithOffset, props, dimensions)
      : centerWithOffset;
  }

  getLabelPadding(style) {
    if (!style) {
      return 0;
    }
    const paddings = Array.isArray(style) ? style.map((s) => s.padding) : [style.padding];
    return Math.max(...paddings, 0);
  }

  getDimensions(props, labelSize, labelStyle) {
    const { orientation, cornerRadius, pointerLength, pointerWidth } = props;
    const padding = this.getLabelPadding(labelStyle);
    const getHeight = () => {
      const calculatedHeight = labelSize.height + padding;
      const minHeight =
        orientation === "top" || orientation === "bottom"
          ? 2 * cornerRadius
          : 2 * cornerRadius + pointerWidth;
      return Math.max(minHeight, calculatedHeight);
    };
    const getWidth = () => {
      const calculatedWidth = labelSize.width + padding;
      const minWidth =
        orientation === "left" || orientation === "right"
          ? 2 * cornerRadius + pointerLength
          : 2 * cornerRadius;
      return Math.max(minWidth, calculatedWidth);
    };
    return {
      height: props.flyoutHeight || getHeight(props, labelSize, orientation) + padding / 2,
      width: props.flyoutWidth || getWidth(props, labelSize, orientation) + padding
    };
  }

  getLabelProps(props, calculatedValues) {
    const { flyoutCenter, labelStyle, labelSize, dy, dx } = calculatedValues;
    const { text, datum, labelComponent, index } = props;
    const textAnchor =
      (Array.isArray(labelStyle) && labelStyle.length
        ? labelStyle[0].textAnchor
        : labelStyle.textAnchor) || "middle";
    const getLabelX = () => {
      const sign = textAnchor === "end" ? -1 : 1;
      return flyoutCenter.x - sign * (labelSize.width / 2);
    };
    return defaults({}, labelComponent.props, {
      key: `${this.id}-label-${index}`,
      text,
      datum,
      textAnchor,
      dy,
      dx,
      style: labelStyle,
      x: !textAnchor || textAnchor === "middle" ? flyoutCenter.x : getLabelX(),
      y: flyoutCenter.y,
      verticalAnchor: "middle",
      angle: labelStyle.angle
    });
  }

  getOrientation(point, center, flyoutDimensions) {
    const edges = {
      bottom: center.y + flyoutDimensions.height / 2,
      top: center.y - flyoutDimensions.height / 2,
      left: center.x - flyoutDimensions.width / 2,
      right: center.x + flyoutDimensions.width / 2
    };

    const gaps = [
      { side: "bottom", val: edges.top > point.y ? edges.top - point.y : -1 },
      { side: "top", val: edges.bottom < point.y ? point.y - edges.bottom : -1 },
      { side: "left", val: edges.right < point.x ? point.x - edges.right : -1 },
      { side: "right", val: edges.left > point.x ? edges.left - point.x : -1 }
    ];

    return orderBy(gaps, "val", "desc")[0].side;
  }

  getFlyoutProps(props, calculatedValues) {
    const { flyoutDimensions, flyoutStyle, flyoutCenter } = calculatedValues;
    const {
      x,
      y,
      dx,
      dy,
      datum,
      index,
      pointerLength,
      pointerWidth,
      cornerRadius,
      events,
      flyoutComponent
    } = props;
    const orientation = this.getOrientation({ x, y }, flyoutCenter, flyoutDimensions);
    return defaults({}, flyoutComponent.props, {
      x,
      y,
      dx,
      dy,
      datum,
      index,
      orientation,
      pointerLength,
      pointerWidth,
      cornerRadius,
      events,
      key: `${this.id}-tooltip-${index}`,
      width: flyoutDimensions.width,
      height: flyoutDimensions.height,
      style: flyoutStyle,
      center: flyoutCenter
    });
  }

  // Overridden in victory-core-native
  renderTooltip(props) {
    const evaluatedProps = this.getEvaluatedProps(props);
    const {
      flyoutComponent,
      labelComponent,
      groupComponent,
      active,
      renderInPortal
    } = evaluatedProps;
    if (!active) {
      return renderInPortal ? <VictoryPortal>{null}</VictoryPortal> : null;
    }
    const calculatedValues = this.getCalculatedValues(evaluatedProps);
    const children = [
      React.cloneElement(flyoutComponent, this.getFlyoutProps(evaluatedProps, calculatedValues)),
      React.cloneElement(labelComponent, this.getLabelProps(evaluatedProps, calculatedValues))
    ];
    const tooltip = React.cloneElement(
      groupComponent,
      { role: "presentation", transform: calculatedValues.transform },
      children
    );
    return renderInPortal ? <VictoryPortal>{tooltip}</VictoryPortal> : tooltip;
  }

  render() {
    const props = Helpers.modifyProps(this.props, fallbackProps, "tooltip");
    return this.renderTooltip(props);
  }
}
