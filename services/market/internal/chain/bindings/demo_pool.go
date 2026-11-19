// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package bindings

import (
	"context"
	"errors"
	"math/big"
	"strings"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
	_ = time.Tick
	_ = context.Background
)

// DemoPoolMetaData contains all meta data concerning the DemoPool contract.
var DemoPoolMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"token0_\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token1_\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"FEE_BPS\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAmountOut\",\"inputs\":[{\"name\":\"tokenIn\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amountIn\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"amountOut\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getReserves\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"owner\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"reserve0\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"reserve1\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"seed\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"swap\",\"inputs\":[{\"name\":\"tokenIn\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amountIn\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"amountOut\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"token0\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"token1\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"Swap\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenIn\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"amountIn\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"amountOut\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Sync\",\"inputs\":[{\"name\":\"reserve0\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"reserve1\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false}]",
}

// DemoPoolABI is the input ABI used to generate the binding from.
// Deprecated: Use DemoPoolMetaData.ABI instead.
var DemoPoolABI = DemoPoolMetaData.ABI

// DemoPool is an auto generated Go binding around an Ethereum contract.
type DemoPool struct {
	DemoPoolCaller     // Read-only binding to the contract
	DemoPoolTransactor // Write-only binding to the contract
	DemoPoolFilterer   // Log filterer for contract events
}

// DemoPoolCaller is an auto generated read-only Go binding around an Ethereum contract.
type DemoPoolCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// DemoPoolTransactor is an auto generated write-only Go binding around an Ethereum contract.
type DemoPoolTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// DemoPoolFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type DemoPoolFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// DemoPoolSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type DemoPoolSession struct {
	Contract     *DemoPool         // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// DemoPoolCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type DemoPoolCallerSession struct {
	Contract *DemoPoolCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts   // Call options to use throughout this session
}

// DemoPoolTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type DemoPoolTransactorSession struct {
	Contract     *DemoPoolTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// DemoPoolRaw is an auto generated low-level Go binding around an Ethereum contract.
type DemoPoolRaw struct {
	Contract *DemoPool // Generic contract binding to access the raw methods on
}

// DemoPoolCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type DemoPoolCallerRaw struct {
	Contract *DemoPoolCaller // Generic read-only contract binding to access the raw methods on
}

// DemoPoolTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type DemoPoolTransactorRaw struct {
	Contract *DemoPoolTransactor // Generic write-only contract binding to access the raw methods on
}

// NewDemoPool creates a new instance of DemoPool, bound to a specific deployed contract.
func NewDemoPool(address common.Address, backend bind.ContractBackend) (*DemoPool, error) {
	contract, err := bindDemoPool(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &DemoPool{DemoPoolCaller: DemoPoolCaller{contract: contract}, DemoPoolTransactor: DemoPoolTransactor{contract: contract}, DemoPoolFilterer: DemoPoolFilterer{contract: contract}}, nil
}

// NewDemoPoolCaller creates a new read-only instance of DemoPool, bound to a specific deployed contract.
func NewDemoPoolCaller(address common.Address, caller bind.ContractCaller) (*DemoPoolCaller, error) {
	contract, err := bindDemoPool(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &DemoPoolCaller{contract: contract}, nil
}

// NewDemoPoolTransactor creates a new write-only instance of DemoPool, bound to a specific deployed contract.
func NewDemoPoolTransactor(address common.Address, transactor bind.ContractTransactor) (*DemoPoolTransactor, error) {
	contract, err := bindDemoPool(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &DemoPoolTransactor{contract: contract}, nil
}

// NewDemoPoolFilterer creates a new log filterer instance of DemoPool, bound to a specific deployed contract.
func NewDemoPoolFilterer(address common.Address, filterer bind.ContractFilterer) (*DemoPoolFilterer, error) {
	contract, err := bindDemoPool(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &DemoPoolFilterer{contract: contract}, nil
}

// bindDemoPool binds a generic wrapper to an already deployed contract.
func bindDemoPool(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := DemoPoolMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_DemoPool *DemoPoolRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _DemoPool.Contract.DemoPoolCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_DemoPool *DemoPoolRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _DemoPool.Contract.DemoPoolTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_DemoPool *DemoPoolRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _DemoPool.Contract.DemoPoolTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_DemoPool *DemoPoolCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _DemoPool.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_DemoPool *DemoPoolTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _DemoPool.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_DemoPool *DemoPoolTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _DemoPool.Contract.contract.Transact(opts, method, params...)
}

// FEEBPS is a free data retrieval call binding the contract method 0xbf333f2c.
//
// Solidity: function FEE_BPS() view returns(uint256)
func (_DemoPool *DemoPoolCaller) FEEBPS(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "FEE_BPS")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// FEEBPS is a free data retrieval call binding the contract method 0xbf333f2c.
//
// Solidity: function FEE_BPS() view returns(uint256)
func (_DemoPool *DemoPoolSession) FEEBPS() (*big.Int, error) {
	return _DemoPool.Contract.FEEBPS(&_DemoPool.CallOpts)
}

// FEEBPS is a free data retrieval call binding the contract method 0xbf333f2c.
//
// Solidity: function FEE_BPS() view returns(uint256)
func (_DemoPool *DemoPoolCallerSession) FEEBPS() (*big.Int, error) {
	return _DemoPool.Contract.FEEBPS(&_DemoPool.CallOpts)
}

// GetAmountOut is a free data retrieval call binding the contract method 0xca706bcf.
//
// Solidity: function getAmountOut(address tokenIn, uint256 amountIn) view returns(uint256 amountOut)
func (_DemoPool *DemoPoolCaller) GetAmountOut(opts *bind.CallOpts, tokenIn common.Address, amountIn *big.Int) (*big.Int, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "getAmountOut", tokenIn, amountIn)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetAmountOut is a free data retrieval call binding the contract method 0xca706bcf.
//
// Solidity: function getAmountOut(address tokenIn, uint256 amountIn) view returns(uint256 amountOut)
func (_DemoPool *DemoPoolSession) GetAmountOut(tokenIn common.Address, amountIn *big.Int) (*big.Int, error) {
	return _DemoPool.Contract.GetAmountOut(&_DemoPool.CallOpts, tokenIn, amountIn)
}

// GetAmountOut is a free data retrieval call binding the contract method 0xca706bcf.
//
// Solidity: function getAmountOut(address tokenIn, uint256 amountIn) view returns(uint256 amountOut)
func (_DemoPool *DemoPoolCallerSession) GetAmountOut(tokenIn common.Address, amountIn *big.Int) (*big.Int, error) {
	return _DemoPool.Contract.GetAmountOut(&_DemoPool.CallOpts, tokenIn, amountIn)
}

// GetReserves is a free data retrieval call binding the contract method 0x0902f1ac.
//
// Solidity: function getReserves() view returns(uint256, uint256)
func (_DemoPool *DemoPoolCaller) GetReserves(opts *bind.CallOpts) (*big.Int, *big.Int, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "getReserves")

	if err != nil {
		return *new(*big.Int), *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	out1 := *abi.ConvertType(out[1], new(*big.Int)).(**big.Int)

	return out0, out1, err

}

// GetReserves is a free data retrieval call binding the contract method 0x0902f1ac.
//
// Solidity: function getReserves() view returns(uint256, uint256)
func (_DemoPool *DemoPoolSession) GetReserves() (*big.Int, *big.Int, error) {
	return _DemoPool.Contract.GetReserves(&_DemoPool.CallOpts)
}

// GetReserves is a free data retrieval call binding the contract method 0x0902f1ac.
//
// Solidity: function getReserves() view returns(uint256, uint256)
func (_DemoPool *DemoPoolCallerSession) GetReserves() (*big.Int, *big.Int, error) {
	return _DemoPool.Contract.GetReserves(&_DemoPool.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_DemoPool *DemoPoolCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_DemoPool *DemoPoolSession) Owner() (common.Address, error) {
	return _DemoPool.Contract.Owner(&_DemoPool.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_DemoPool *DemoPoolCallerSession) Owner() (common.Address, error) {
	return _DemoPool.Contract.Owner(&_DemoPool.CallOpts)
}

// Reserve0 is a free data retrieval call binding the contract method 0x443cb4bc.
//
// Solidity: function reserve0() view returns(uint256)
func (_DemoPool *DemoPoolCaller) Reserve0(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "reserve0")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Reserve0 is a free data retrieval call binding the contract method 0x443cb4bc.
//
// Solidity: function reserve0() view returns(uint256)
func (_DemoPool *DemoPoolSession) Reserve0() (*big.Int, error) {
	return _DemoPool.Contract.Reserve0(&_DemoPool.CallOpts)
}

// Reserve0 is a free data retrieval call binding the contract method 0x443cb4bc.
//
// Solidity: function reserve0() view returns(uint256)
func (_DemoPool *DemoPoolCallerSession) Reserve0() (*big.Int, error) {
	return _DemoPool.Contract.Reserve0(&_DemoPool.CallOpts)
}

// Reserve1 is a free data retrieval call binding the contract method 0x5a76f25e.
//
// Solidity: function reserve1() view returns(uint256)
func (_DemoPool *DemoPoolCaller) Reserve1(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "reserve1")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Reserve1 is a free data retrieval call binding the contract method 0x5a76f25e.
//
// Solidity: function reserve1() view returns(uint256)
func (_DemoPool *DemoPoolSession) Reserve1() (*big.Int, error) {
	return _DemoPool.Contract.Reserve1(&_DemoPool.CallOpts)
}

// Reserve1 is a free data retrieval call binding the contract method 0x5a76f25e.
//
// Solidity: function reserve1() view returns(uint256)
func (_DemoPool *DemoPoolCallerSession) Reserve1() (*big.Int, error) {
	return _DemoPool.Contract.Reserve1(&_DemoPool.CallOpts)
}

// Token0 is a free data retrieval call binding the contract method 0x0dfe1681.
//
// Solidity: function token0() view returns(address)
func (_DemoPool *DemoPoolCaller) Token0(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "token0")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Token0 is a free data retrieval call binding the contract method 0x0dfe1681.
//
// Solidity: function token0() view returns(address)
func (_DemoPool *DemoPoolSession) Token0() (common.Address, error) {
	return _DemoPool.Contract.Token0(&_DemoPool.CallOpts)
}

// Token0 is a free data retrieval call binding the contract method 0x0dfe1681.
//
// Solidity: function token0() view returns(address)
func (_DemoPool *DemoPoolCallerSession) Token0() (common.Address, error) {
	return _DemoPool.Contract.Token0(&_DemoPool.CallOpts)
}

// Token1 is a free data retrieval call binding the contract method 0xd21220a7.
//
// Solidity: function token1() view returns(address)
func (_DemoPool *DemoPoolCaller) Token1(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _DemoPool.contract.Call(opts, &out, "token1")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Token1 is a free data retrieval call binding the contract method 0xd21220a7.
//
// Solidity: function token1() view returns(address)
func (_DemoPool *DemoPoolSession) Token1() (common.Address, error) {
	return _DemoPool.Contract.Token1(&_DemoPool.CallOpts)
}

// Token1 is a free data retrieval call binding the contract method 0xd21220a7.
//
// Solidity: function token1() view returns(address)
func (_DemoPool *DemoPoolCallerSession) Token1() (common.Address, error) {
	return _DemoPool.Contract.Token1(&_DemoPool.CallOpts)
}

// Seed is a paid mutator transaction binding the contract method 0x7d94792a.
//
// Solidity: function seed() returns()
func (_DemoPool *DemoPoolTransactor) Seed(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _DemoPool.contract.Transact(opts, "seed")
}

// Seed is a paid mutator transaction binding the contract method 0x7d94792a.
//
// Solidity: function seed() returns()
func (_DemoPool *DemoPoolSession) Seed() (*types.Transaction, error) {
	return _DemoPool.Contract.Seed(&_DemoPool.TransactOpts)
}

// Seed is a paid mutator transaction binding the contract method 0x7d94792a.
//
// Solidity: function seed() returns()
func (_DemoPool *DemoPoolTransactorSession) Seed() (*types.Transaction, error) {
	return _DemoPool.Contract.Seed(&_DemoPool.TransactOpts)
}

// Swap is a paid mutator transaction binding the contract method 0xd004f0f7.
//
// Solidity: function swap(address tokenIn, uint256 amountIn) returns(uint256 amountOut)
func (_DemoPool *DemoPoolTransactor) Swap(opts *bind.TransactOpts, tokenIn common.Address, amountIn *big.Int) (*types.Transaction, error) {
	return _DemoPool.contract.Transact(opts, "swap", tokenIn, amountIn)
}

// Swap is a paid mutator transaction binding the contract method 0xd004f0f7.
//
// Solidity: function swap(address tokenIn, uint256 amountIn) returns(uint256 amountOut)
func (_DemoPool *DemoPoolSession) Swap(tokenIn common.Address, amountIn *big.Int) (*types.Transaction, error) {
	return _DemoPool.Contract.Swap(&_DemoPool.TransactOpts, tokenIn, amountIn)
}

// Swap is a paid mutator transaction binding the contract method 0xd004f0f7.
//
// Solidity: function swap(address tokenIn, uint256 amountIn) returns(uint256 amountOut)
func (_DemoPool *DemoPoolTransactorSession) Swap(tokenIn common.Address, amountIn *big.Int) (*types.Transaction, error) {
	return _DemoPool.Contract.Swap(&_DemoPool.TransactOpts, tokenIn, amountIn)
}

// DemoPoolSwapIterator is returned from FilterSwap and is used to iterate over the raw logs and unpacked data for Swap events raised by the DemoPool contract.
type DemoPoolSwapIterator struct {
	Event *DemoPoolSwap // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *DemoPoolSwapIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(DemoPoolSwap)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(DemoPoolSwap)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *DemoPoolSwapIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *DemoPoolSwapIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// DemoPoolSwap represents a Swap event raised by the DemoPool contract.
type DemoPoolSwap struct {
	Sender    common.Address
	TokenIn   common.Address
	AmountIn  *big.Int
	AmountOut *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterSwap is a free log retrieval operation binding the contract event 0xfa2dda1cc1b86e41239702756b13effbc1a092b5c57e3ad320fbe4f3b13fe235.
//
// Solidity: event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut)
func (_DemoPool *DemoPoolFilterer) FilterSwap(opts *bind.FilterOpts, sender []common.Address, tokenIn []common.Address) (*DemoPoolSwapIterator, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}
	var tokenInRule []interface{}
	for _, tokenInItem := range tokenIn {
		tokenInRule = append(tokenInRule, tokenInItem)
	}

	logs, sub, err := _DemoPool.contract.FilterLogs(opts, "Swap", senderRule, tokenInRule)
	if err != nil {
		return nil, err
	}
	return &DemoPoolSwapIterator{contract: _DemoPool.contract, event: "Swap", logs: logs, sub: sub}, nil
}

// WatchSwap is a free log subscription operation binding the contract event 0xfa2dda1cc1b86e41239702756b13effbc1a092b5c57e3ad320fbe4f3b13fe235.
//
// Solidity: event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut)
func (_DemoPool *DemoPoolFilterer) WatchSwap(opts *bind.WatchOpts, sink chan<- *DemoPoolSwap, sender []common.Address, tokenIn []common.Address) (event.Subscription, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}
	var tokenInRule []interface{}
	for _, tokenInItem := range tokenIn {
		tokenInRule = append(tokenInRule, tokenInItem)
	}

	logs, sub, err := _DemoPool.contract.WatchLogs(opts, "Swap", senderRule, tokenInRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(DemoPoolSwap)
				if err := _DemoPool.contract.UnpackLog(event, "Swap", log); err != nil {
					// If the signature doesn't match, skip this log.
					if errors.Is(err, bind.ErrEventSignatureMismatch) {
						continue
					}
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseSwap is a log parse operation binding the contract event 0xfa2dda1cc1b86e41239702756b13effbc1a092b5c57e3ad320fbe4f3b13fe235.
//
// Solidity: event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut)
func (_DemoPool *DemoPoolFilterer) ParseSwap(log types.Log) (*DemoPoolSwap, error) {
	event := new(DemoPoolSwap)
	if err := _DemoPool.contract.UnpackLog(event, "Swap", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// DemoPoolSyncIterator is returned from FilterSync and is used to iterate over the raw logs and unpacked data for Sync events raised by the DemoPool contract.
type DemoPoolSyncIterator struct {
	Event *DemoPoolSync // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *DemoPoolSyncIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(DemoPoolSync)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(DemoPoolSync)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *DemoPoolSyncIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *DemoPoolSyncIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// DemoPoolSync represents a Sync event raised by the DemoPool contract.
type DemoPoolSync struct {
	Reserve0 *big.Int
	Reserve1 *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterSync is a free log retrieval operation binding the contract event 0xcf2aa50876cdfbb541206f89af0ee78d44a2abf8d328e37fa4917f982149848a.
//
// Solidity: event Sync(uint256 reserve0, uint256 reserve1)
func (_DemoPool *DemoPoolFilterer) FilterSync(opts *bind.FilterOpts) (*DemoPoolSyncIterator, error) {

	logs, sub, err := _DemoPool.contract.FilterLogs(opts, "Sync")
	if err != nil {
		return nil, err
	}
	return &DemoPoolSyncIterator{contract: _DemoPool.contract, event: "Sync", logs: logs, sub: sub}, nil
}

// WatchSync is a free log subscription operation binding the contract event 0xcf2aa50876cdfbb541206f89af0ee78d44a2abf8d328e37fa4917f982149848a.
//
// Solidity: event Sync(uint256 reserve0, uint256 reserve1)
func (_DemoPool *DemoPoolFilterer) WatchSync(opts *bind.WatchOpts, sink chan<- *DemoPoolSync) (event.Subscription, error) {

	logs, sub, err := _DemoPool.contract.WatchLogs(opts, "Sync")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(DemoPoolSync)
				if err := _DemoPool.contract.UnpackLog(event, "Sync", log); err != nil {
					// If the signature doesn't match, skip this log.
					if errors.Is(err, bind.ErrEventSignatureMismatch) {
						continue
					}
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseSync is a log parse operation binding the contract event 0xcf2aa50876cdfbb541206f89af0ee78d44a2abf8d328e37fa4917f982149848a.
//
// Solidity: event Sync(uint256 reserve0, uint256 reserve1)
func (_DemoPool *DemoPoolFilterer) ParseSync(log types.Log) (*DemoPoolSync, error) {
	event := new(DemoPoolSync)
	if err := _DemoPool.contract.UnpackLog(event, "Sync", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
