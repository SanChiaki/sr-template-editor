# Excel模板编辑器定义

这是SmartReport项目中用于Excel模板编辑的模块，用于可视化地编辑模板中的静态内容与智能组件。

页面左侧是一个spreadjs，用于渲染与编辑Excel，右侧是组件管理栏，用于展示当前页面所有智能组件，以及用于组件属性的设置。

智能组件通过一个json描述，最核心的属性是location，type，和prompt。智能组件默认会复用location区域的样式。
1. location用于描述组件在Excel中的位置
2. type代表组件类型，如text, table，chart等
3. prompt用于引导大模型处理数据的方式

```json
{
    "location":"A1:B2",
    "type":"Text",
    "prompt":"输出本期进展"
}
```

由于excel中无法组合一个区域来操作，我们无法直接以一个整体的方式操作智能组件。
因此我们采用间接的方式来操作，当设置一个智能组件之后，在对应的location上呈现一个透明的矩形shape，覆盖该区域，让用户知道这片区域属于智能组件。
用户可以移动拉伸形状来影响智能组件的location。

